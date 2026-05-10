import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import {
  IOnePasswordClient,
  OnePasswordField,
  OnePasswordSafeItemDetails,
  OnePasswordSafeField,
} from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import {
  readOnePasswordElicitationConfig,
  isItemWhitelisted,
  type OnePasswordElicitationConfig,
} from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  itemId: 'The title of the item to retrieve. Get item titles from onepassword_list_items.',
  vaultId:
    'Optional vault ID to narrow the search. Recommended for precision when titles may overlap.',
} as const;

const GetItemItemSchema = z.object({
  itemId: z.string().min(1).describe(PARAM_DESCRIPTIONS.itemId),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

export const GetItemSchema = z.object({
  items: z
    .array(GetItemItemSchema)
    .min(1, { message: 'items must contain at least one item to fetch' })
    .describe(
      'Array of items to fetch. Provide all lookups in a single call so a single approval prompt covers any sensitive-field reveals across the batch.'
    ),
});

const TOOL_DESCRIPTION = `Get the details of one or more 1Password items in a single call. Bulk calls require only one user approval to reveal sensitive fields, so prefer bulk whenever you anticipate looking up multiple items in a session.

**Only use this tool when you actually need to read a credential value.** If you only need to check whether an item exists or inspect its field structure (titles, vault, tags, field labels, types, URLs), call \`onepassword_get_item_metadata\` instead — that path returns the same metadata without triggering an approval prompt.

When you know in advance that you'll need details for multiple items, bundle them into one \`items\` array instead of firing sequential per-item calls — sequential calls force a separate approval prompt for each item with sensitive fields.

Retrieves item information including metadata and fields. For security, **sensitive credential fields require approval before being revealed**.

**Approval behavior (configurable via environment variables):**
- If elicitation is enabled (default), you will be asked to confirm before credentials are shown — approving once covers every item in the batch with sensitive fields
- Whitelisted items (via OP_WHITELISTED_ITEMS, matched by title or item ID) bypass the confirmation prompt
- If elicitation is disabled, credentials are returned directly

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\`
  (\`success\` or \`error\`) and either the item details or an error message.
- Each successful result includes:
  - Item metadata (title, category, vault, tags, timestamps)
  - Field names and types
  - For APPROVED items: actual credential values
  - For DENIED items: field values show "[REDACTED]"
  - A \`_credentialsRevealed\` boolean noting whether sensitive fields were revealed for that item

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- View item metadata and structure (one or many at once)
- Retrieve credentials after approval
- Discover what fields items contain`;

const SENSITIVE_FIELD_TYPES = new Set([
  'CONCEALED',
  'PASSWORD',
  'SECRET',
  'CREDIT_CARD_NUMBER',
  'CREDIT_CARD_CVV',
]);

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /cvv/i,
  /pin/i,
];

function isSensitiveField(field: OnePasswordField | OnePasswordSafeField): boolean {
  if (field.type && SENSITIVE_FIELD_TYPES.has(field.type.toUpperCase())) {
    return true;
  }
  const fieldIdentifier = (('id' in field ? field.id : '') || field.label || '').toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldIdentifier));
}

function redactSensitiveFields(item: OnePasswordSafeItemDetails): OnePasswordSafeItemDetails {
  const redactedItem = { ...item };

  if (redactedItem.fields) {
    redactedItem.fields = redactedItem.fields.map((field) => {
      if (isSensitiveField(field) && field.value) {
        return {
          ...field,
          value: '[REDACTED]',
        };
      }
      return field;
    });
  }

  return redactedItem;
}

interface FetchedItem {
  index: number;
  itemTitle: string;
  itemId: string;
  sanitized: OnePasswordSafeItemDetails;
  hasSensitiveFields: boolean;
  whitelisted: boolean;
}

interface GetItemResult {
  index: number;
  status: 'success' | 'error';
  item?: OnePasswordSafeItemDetails & { _credentialsRevealed: boolean };
  error?: string;
}

/**
 * Decide whether to reveal sensitive fields for the gated subset of items via a single
 * batched elicitation prompt.
 */
async function batchShouldReveal(
  server: Server,
  gated: FetchedItem[],
  elicitConfig: OnePasswordElicitationConfig
): Promise<boolean> {
  if (gated.length === 0) {
    return true;
  }

  const summary = gated.map((g, i) => `  ${i + 1}. ${g.itemTitle}`).join('\n');

  const confirmation = await requestConfirmation(
    {
      server,
      message:
        `1Password credential access requested for the following items:\n${summary}\n\n` +
        `Approve to reveal sensitive fields (passwords, secrets, tokens, etc.) on every item above. ` +
        `Approving covers the entire batch.`,
      requestedSchema: createConfirmationSchema(
        gated.length === 1
          ? 'Reveal credentials?'
          : `Reveal credentials for ${gated.length} items?`,
        'Allow access to sensitive fields on these items.'
      ),
      meta: {
        'com.pulsemcp/tool-name': 'onepassword_get_item',
      },
    },
    elicitConfig.base
  );

  if (confirmation.action !== 'accept') {
    return false;
  }

  // Defense-in-depth: some MCP clients may return action='accept' without the
  // user explicitly checking the confirmation checkbox.
  if (
    confirmation.content &&
    'confirm' in confirmation.content &&
    confirmation.content.confirm === false
  ) {
    return false;
  }

  return true;
}

/**
 * Tool for getting item details in bulk.
 */
export function getItemTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_get_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of items to fetch. Provide all lookups in a single call so a single approval prompt covers any sensitive-field reveals across the batch.',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: PARAM_DESCRIPTIONS.itemId },
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
            },
            required: ['itemId'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = GetItemSchema.parse(args);
        const client = clientFactory();
        const elicitConfig = readOnePasswordElicitationConfig();

        // Phase 1 — fetch every item, recording per-index errors.
        const results: GetItemResult[] = new Array(items.length);
        const fetched: FetchedItem[] = [];
        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const raw = await client.getItem(it.itemId, it.vaultId);
            const sanitized = sanitizeItemDetails(raw);
            const hasSensitiveFields = !!sanitized.fields?.some(
              (f) => isSensitiveField(f) && f.value
            );
            const whitelisted = isItemWhitelisted(elicitConfig, raw.title, raw.id);
            fetched.push({
              index,
              itemTitle: raw.title,
              itemId: raw.id,
              sanitized,
              hasSensitiveFields,
              whitelisted,
            });
          } catch (error) {
            results[index] = {
              index,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }

        // Phase 2 — decide which items need approval to reveal sensitive fields.
        const readGated = elicitConfig.readElicitationEnabled;
        const itemsNeedingApproval = fetched.filter(
          (f) => readGated && f.hasSensitiveFields && !f.whitelisted
        );
        const reveal =
          itemsNeedingApproval.length === 0
            ? true
            : await batchShouldReveal(server, itemsNeedingApproval, elicitConfig);

        // Phase 3 — assemble per-item results.
        for (const f of fetched) {
          const shouldReveal = !readGated || !f.hasSensitiveFields || f.whitelisted || reveal;
          const responseItem = shouldReveal ? f.sanitized : redactSensitiveFields(f.sanitized);
          results[f.index] = {
            index: f.index,
            status: 'success',
            item: { ...responseItem, _credentialsRevealed: shouldReveal },
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting items: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
