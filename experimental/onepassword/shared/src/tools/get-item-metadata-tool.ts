import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient, OnePasswordSafeItemDetails, OnePasswordSafeField } from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';

const PARAM_DESCRIPTIONS = {
  itemId:
    'The title of the item whose metadata to retrieve. Get item titles from onepassword_list_items.',
  vaultId:
    'Optional vault ID to narrow the search. Recommended for precision when titles may overlap.',
} as const;

const GetItemMetadataItemSchema = z.object({
  itemId: z.string().min(1).describe(PARAM_DESCRIPTIONS.itemId),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

export const GetItemMetadataSchema = z.object({
  items: z
    .array(GetItemMetadataItemSchema)
    .min(1, { message: 'items must contain at least one item to fetch' })
    .describe(
      'Array of items to fetch metadata for. Bundle multiple lookups into one call when checking existence across several items.'
    ),
});

const TOOL_DESCRIPTION = `Get the non-sensitive metadata for one or more 1Password items WITHOUT triggering an approval prompt. Use this whenever you only need to check whether an item exists or inspect its structure (titles, vault, tags, field labels/types, URLs, dates) — never to read the secret value of a field.

This is the right tool for existence checks (e.g., "is there already a 1Password entry for customer X before I mint a new credential?"). Use \`onepassword_get_item\` instead when you actually need to read a credential value — that path requires user approval.

**What's returned:**
- Item metadata (title, category, vault, tags, timestamps)
- All field labels and types
- Non-sensitive field values (e.g., username, hostname, notes)
- URLs associated with the item

**What's never returned:** The actual values of any sensitive credential fields. Sensitive fields (CONCEALED, PASSWORD, SECRET, CREDIT_CARD_*, or labels matching password/secret/token/key/credential/cvv/pin) appear in the response with the field's \`value\` stripped entirely — not even a [REDACTED] placeholder. To read those values, call \`onepassword_get_item\` with the same arguments; that tool will gate the reveal behind an approval prompt.

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\` (\`success\` or \`error\`) and either the metadata or an error message.
- Partial failures are surfaced per item — a single bad lookup does not abort the batch.

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- Check whether an item with a given title exists in a vault before minting a new credential
- Discover which fields an item contains before deciding to fetch its credentials
- Inventory metadata across many items without per-item approval friction`;

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

function isSensitiveField(field: OnePasswordSafeField): boolean {
  if (field.type && SENSITIVE_FIELD_TYPES.has(field.type.toUpperCase())) {
    return true;
  }
  const fieldIdentifier = (field.label || '').toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldIdentifier));
}

function stripSensitiveFieldValues(item: OnePasswordSafeItemDetails): OnePasswordSafeItemDetails {
  const stripped = { ...item };
  if (stripped.fields) {
    stripped.fields = stripped.fields.map((field) => {
      if (isSensitiveField(field)) {
        return {
          type: field.type,
          purpose: field.purpose,
          label: field.label,
        };
      }
      return field;
    });
  }
  return stripped;
}

interface GetItemMetadataResult {
  index: number;
  status: 'success' | 'error';
  item?: OnePasswordSafeItemDetails;
  error?: string;
}

/**
 * Tool for getting non-sensitive item metadata in bulk, without elicitation.
 *
 * This tool is a metadata-only sibling to `onepassword_get_item`. It exists so agents can
 * answer existence and structure questions ("does an entry for customer X exist?",
 * "which fields does this item have?") without paying the elicitation-prompt cost that
 * `get_item` levies on any item carrying a sensitive field.
 *
 * Sensitive field values are stripped from the response entirely, so this code path
 * cannot leak secrets even on a future bug — and therefore does not need elicitation.
 */
export function getItemMetadataTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_get_item_metadata',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of items to fetch metadata for. Bundle multiple lookups into one call when checking existence across several items.',
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
        const { items } = GetItemMetadataSchema.parse(args);
        const client = clientFactory();
        const results: GetItemMetadataResult[] = [];

        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const raw = await client.getItem(it.itemId, it.vaultId);
            const sanitized = sanitizeItemDetails(raw);
            const stripped = stripSensitiveFieldValues(sanitized);
            results.push({ index, status: 'success', item: stripped });
          } catch (error) {
            results.push({
              index,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting item metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
