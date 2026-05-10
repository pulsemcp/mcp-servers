import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient, OnePasswordItem } from '../types.js';

const PARAM_DESCRIPTIONS = {
  tag: 'The tag to filter items by. Only items with this exact tag will be returned.',
  vaultId: 'Optional vault ID to limit the search to a specific vault.',
} as const;

const ListItemsByTagItemSchema = z.object({
  tag: z.string().min(1).describe(PARAM_DESCRIPTIONS.tag),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

export const ListItemsByTagSchema = z.object({
  items: z
    .array(ListItemsByTagItemSchema)
    .min(1, { message: 'items must contain at least one tag query to run' })
    .describe(
      'Array of tag queries. Provide all tag/vault pairs for the batch in a single call when you need to filter by multiple tags or scope across multiple vaults.'
    ),
});

const TOOL_DESCRIPTION = `List 1Password items matching one or more tag queries in a single call. Prefer bulk whenever you anticipate filtering by multiple tags or vaults in a session — it returns all results in one round-trip.

Filters items across vaults (or within a specific vault) by tag. Useful for organizing and finding related items.

**Returns:**
- A \`results\` array (one entry per input query, in input order) reporting per-query \`status\`
  (\`success\` or \`error\`) and either the matching items or an error message.
- Partial failures are surfaced per query — a single bad query does not abort the batch.

Each item in a successful response includes:
  - title: Item name
  - category: Item type
  - vault: Vault name (optional)
  - tags: All tags on the item

**Security Note:** Item IDs are intentionally omitted.

**Use cases:**
- Find all items tagged for a specific project or environment (across multiple tags or vaults)
- Locate production vs development credentials
- Group related secrets (e.g., all "aws" tagged items)`;

interface ListItemsByTagResult {
  index: number;
  status: 'success' | 'error';
  tag: string;
  vaultId?: string;
  items?: OnePasswordItem[];
  error?: string;
}

/**
 * Tool for listing items by tag across one or more queries.
 */
export function listItemsByTagTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_list_items_by_tag',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of tag queries. Provide all tag/vault pairs for the batch in a single call when you need to filter by multiple tags or scope across multiple vaults.',
          items: {
            type: 'object',
            properties: {
              tag: { type: 'string', description: PARAM_DESCRIPTIONS.tag },
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
            },
            required: ['tag'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = ListItemsByTagSchema.parse(args);
        const client = clientFactory();
        const results: ListItemsByTagResult[] = [];

        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const list = await client.listItemsByTag(it.tag, it.vaultId);
            results.push({
              index,
              status: 'success',
              tag: it.tag,
              vaultId: it.vaultId,
              items: list,
            });
          } catch (error) {
            results.push({
              index,
              status: 'error',
              tag: it.tag,
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
              text: `Error listing items by tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
