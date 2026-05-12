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
      'Array of list-items requests. Pass every vault you need to list in a single call rather than calling this tool once per vault. Use this tool up front for discovery so downstream onepassword_get_item / onepassword_share_item / etc. calls can be made as a single bulk batch.'
    ),
});

const TOOL_DESCRIPTION = `List items in one or more 1Password vaults in a single call.

**BATCH ALL VAULT LISTINGS INTO ONE CALL.** When you need to enumerate items from multiple vaults, pass every \`vaultId\` in a single \`items\` array — one round-trip, no per-call approval friction. Calling this tool once per vault is wasteful and slow.

**Use this tool for discovery to avoid get_item loops.** This tool returns titles, categories, and tags for every item in a vault without triggering any sensitive-field elicitation. When you need to find candidate items for downstream work (e.g., retrieving full details with \`onepassword_get_item\` or sharing several items with \`onepassword_share_item\`), call this tool ONCE up front and use the results to assemble a single bulk follow-up — instead of fanning out individual \`onepassword_get_item\` lookups, each of which would prompt the user.

**Anti-patterns (do NOT do this):**
- Calling \`onepassword_list_items\` once per vault when you need items from several vaults — pass all vault IDs in one call.
- Skipping the list step and calling \`onepassword_get_item\` repeatedly to "search" — \`get_item\` reveals sensitive fields and prompts the user; \`list_items\` does not.

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
            'Array of list-items requests. Pass every vault you need to list in a single call rather than calling this tool once per vault. Use this tool up front for discovery so downstream onepassword_get_item / onepassword_share_item / etc. calls can be made as a single bulk batch.',
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
