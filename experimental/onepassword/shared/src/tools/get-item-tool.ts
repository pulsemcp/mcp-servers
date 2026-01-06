import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient } from '../types.js';

const PARAM_DESCRIPTIONS = {
  itemId: 'The ID or title of the item to retrieve. Using the ID is recommended for precision.',
  vaultId:
    'Optional vault ID to narrow the search. Recommended when using item title instead of ID.',
} as const;

export const GetItemSchema = z.object({
  itemId: z.string().min(1).describe(PARAM_DESCRIPTIONS.itemId),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

const TOOL_DESCRIPTION = `Get the full details of a specific 1Password item.

Retrieves complete item information including all fields, passwords, and metadata. Use this to access stored credentials and secrets.

**Returns:**
- Full item details including:
  - id, title, category
  - vault information
  - fields (username, password, notes, custom fields)
  - URLs (for login items)
  - tags and timestamps

**Use cases:**
- Retrieve login credentials (username/password)
- Access API keys stored as secure notes
- Get any stored secret or credential

**Note:** Sensitive field values are included in the response. Handle with care.`;

/**
 * Tool for getting item details
 */
export function getItemTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_get_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        itemId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.itemId,
        },
        vaultId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vaultId,
        },
      },
      required: ['itemId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetItemSchema.parse(args);
        const client = clientFactory();
        const item = await client.getItem(validatedArgs.itemId, validatedArgs.vaultId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(item, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
