import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient } from '../types.js';

const PARAM_DESCRIPTIONS = {
  tag: 'The tag to filter items by. Only items with this exact tag will be returned.',
  vaultId: 'Optional vault ID to limit the search to a specific vault.',
} as const;

export const ListItemsByTagSchema = z.object({
  tag: z.string().min(1).describe(PARAM_DESCRIPTIONS.tag),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

const TOOL_DESCRIPTION = `List 1Password items that have a specific tag.

Filters items across vaults (or within a specific vault) by tag. Useful for organizing and finding related items.

**Returns:**
- Array of items with the specified tag, each with:
  - id: Unique item identifier
  - title: Item name
  - category: Item type
  - tags: All tags on the item

**Use cases:**
- Find all items tagged for a specific project or environment
- Locate production vs development credentials
- Group related secrets (e.g., all "aws" tagged items)`;

/**
 * Tool for listing items by tag
 */
export function listItemsByTagTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_list_items_by_tag',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tag,
        },
        vaultId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vaultId,
        },
      },
      required: ['tag'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListItemsByTagSchema.parse(args);
        const client = clientFactory();
        const items = await client.listItemsByTag(validatedArgs.tag, validatedArgs.vaultId);

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
              text: `Error listing items by tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
