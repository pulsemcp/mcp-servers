import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient } from '../types.js';

const PARAM_DESCRIPTIONS = {
  vaultId:
    'The ID of the vault to list items from. Use onepassword_list_vaults to get available vault IDs.',
} as const;

export const ListItemsSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
});

const TOOL_DESCRIPTION = `List all items in a specific 1Password vault.

Returns a list of items with their IDs, titles, and categories. Use item IDs when calling onepassword_get_item to retrieve full details.

**Returns:**
- Array of items, each with:
  - id: Unique item identifier
  - title: Item name
  - category: Item type (LOGIN, SECURE_NOTE, etc.)
  - tags: Optional array of tags

**Use cases:**
- Browse items in a vault to find what you need
- Get item IDs for retrieving full details
- See categories and tags for organization`;

/**
 * Tool for listing items in a vault
 */
export function listItemsTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_list_items',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        vaultId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vaultId,
        },
      },
      required: ['vaultId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListItemsSchema.parse(args);
        const client = clientFactory();
        const items = await client.listItems(validatedArgs.vaultId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(items, null, 2),
            },
          ],
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
