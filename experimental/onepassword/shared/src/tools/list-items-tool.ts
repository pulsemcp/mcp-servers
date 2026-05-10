import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient, OnePasswordItem } from '../types.js';

const PARAM_DESCRIPTIONS = {
  vaultId:
    'The ID of the vault to list items from. Use onepassword_list_vaults to get available vault IDs.',
} as const;

const ListItemsItemSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
});

export const ListItemsSchema = z.object({
  items: z
    .array(ListItemsItemSchema)
    .min(1, { message: 'items must contain at least one vault to list' })
    .describe(
      'Array of list-items requests. Provide all vault listings for the batch in a single call when you need items from multiple vaults.'
    ),
});

const TOOL_DESCRIPTION = `List items in one or more 1Password vaults in a single call. Prefer bulk whenever you anticipate listing items from multiple vaults in a session — it returns all results in one round-trip.

Returns lists of items with their titles and categories. Use item titles when calling onepassword_get_item to retrieve full details.

**Returns:**
- A \`results\` array (one entry per input request, in input order) reporting per-request \`status\`
  (\`success\` or \`error\`) and either the list of items or an error message.
- Partial failures are surfaced per request — a single bad request does not abort the batch.

Each item in a successful response includes:
  - title: Item name
  - category: Item type (LOGIN, SECURE_NOTE, etc.)
  - vault: Vault name (optional)
  - tags: Optional array of tags

**Security Note:** Item IDs are intentionally omitted.

**Use cases:**
- Browse items across multiple vaults to find what you need
- Get item titles for retrieving full details
- See categories and tags for organization`;

interface ListItemsResult {
  index: number;
  status: 'success' | 'error';
  vaultId: string;
  items?: OnePasswordItem[];
  error?: string;
}

/**
 * Tool for listing items across one or more vaults.
 */
export function listItemsTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_list_items',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of list-items requests. Provide all vault listings for the batch in a single call when you need items from multiple vaults.',
          items: {
            type: 'object',
            properties: {
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
            },
            required: ['vaultId'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = ListItemsSchema.parse(args);
        const client = clientFactory();
        const results: ListItemsResult[] = [];

        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const list = await client.listItems(it.vaultId);
            results.push({ index, status: 'success', vaultId: it.vaultId, items: list });
          } catch (error) {
            results.push({
              index,
              status: 'error',
              vaultId: it.vaultId,
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
              text: `Error listing items: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
