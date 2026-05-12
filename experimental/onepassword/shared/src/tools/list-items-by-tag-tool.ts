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
      'Array of tag queries. Pass every tag/vault pair you need to query in a single call rather than calling this tool once per tag. Use this tool up front for discovery so downstream onepassword_get_item / onepassword_share_item / etc. calls can be made as a single bulk batch.'
    ),
});

const TOOL_DESCRIPTION = `List 1Password items matching one or more tag queries in a single call.

**BATCH ALL TAG QUERIES INTO ONE CALL.** When you need to filter by multiple tags or scope across multiple vaults, pass every \`tag\` (and optional \`vaultId\`) in a single \`items\` array — one round-trip. Calling this tool once per tag is wasteful and slow.

**Use this tool for discovery to avoid get_item loops.** This tool returns titles, categories, and tags without triggering any sensitive-field elicitation. When you need to find candidate items by tag for downstream work (e.g., retrieving full details with \`onepassword_get_item\` or sharing several items with \`onepassword_share_item\`), call this tool ONCE up front and use the results to assemble a single bulk follow-up — instead of fanning out individual \`onepassword_get_item\` lookups, each of which would prompt the user.

**Anti-patterns (do NOT do this):**
- Calling \`onepassword_list_items_by_tag\` once per tag when you need items for several tags — pass all tag/vault pairs in one call.
- Skipping the list step and calling \`onepassword_get_item\` repeatedly to "search" by tag — \`get_item\` reveals sensitive fields and prompts the user; this tool does not.

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
            'Array of tag queries. Pass every tag/vault pair you need to query in a single call rather than calling this tool once per tag. Use this tool up front for discovery so downstream onepassword_get_item / onepassword_share_item / etc. calls can be made as a single bulk batch.',
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
