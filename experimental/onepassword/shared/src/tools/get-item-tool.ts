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
      'Array of items to fetch. Always pass every lookup you plan to perform in a single call — one approval prompt covers sensitive-field reveals across the entire batch. Calling this tool repeatedly with one item per call subjects the user to a stream of approval prompts and should be avoided. For discovery, prefer onepassword_list_items / onepassword_list_items_by_tag (no sensitive-field approval) over a fan-out of single-item lookups.'
    ),
});

const TOOL_DESCRIPTION = `Get the details of one or more 1Password items in a single call.

**Only use this tool when you actually need to read a credential value.** If you only need to check whether an item exists or inspect its field structure (titles, vault, tags, field labels, types, URLs), call \`onepassword_get_item_metadata\` instead — that path returns the same metadata without triggering an approval prompt.

**BATCH ALL LOOKUPS INTO ONE CALL.** Sensitive-field reveal is gated by a single user approval that covers the entire \`items\` array. Calling this tool once with N items shows the user one prompt listing all N items; calling it N times forces N separate approval prompts seconds apart — exactly the kind of repeated interruption that frustrates users.

**Plan up front, then call once.** Before invoking this tool, identify every item whose details you'll need for the current workflow (e.g., from \`onepassword_list_items\` or \`onepassword_list_items_by_tag\` results, or from a known list the user provided) and pass them all in one \`items\` array.

**For discovery, use bulk listing first.** If you don't yet know which items you need, do NOT loop \`onepassword_get_item\` over a guess-list. Instead:
- Call \`onepassword_list_vaults\` once (no approval) to discover vaults.
- Call \`onepassword_list_items\` (single call, multi-vault) or \`onepassword_list_items_by_tag\` (single call, multi-query) to enumerate candidates without triggering any sensitive-field approval.
- If you only need metadata (not the credential value), call \`onepassword_get_item_metadata\` — it accepts a bulk array and never elicits.
- Then call this tool ONCE with the consolidated list of items whose full credential details you actually need.

**Anti-patterns (do NOT do this):**
- Looping over titles and calling \`onepassword_get_item\` once per item.
- Calling \`onepassword_get_item\` to "browse" or "search" for an item — use the list tools for that; they return titles, categories, and tags without sensitive-field elicitation.
- Calling \`onepassword_get_item\` just to confirm an item exists or inspect its field structure — use \`onepassword_get_item_metadata\`, which never elicits.
- Splitting a known-up-front lookup batch into multiple calls because the items live in different vaults — a single call can fetch items across multiple vaults and is still one approval.

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
            'Array of items to fetch. Always pass every lookup you plan to perform in a single call — one approval prompt covers sensitive-field reveals across the entire batch. Calling this tool repeatedly with one item per call subjects the user to a stream of approval prompts and should be avoided. For discovery, prefer onepassword_list_items / onepassword_list_items_by_tag (no sensitive-field approval) over a fan-out of single-item lookups.',
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
