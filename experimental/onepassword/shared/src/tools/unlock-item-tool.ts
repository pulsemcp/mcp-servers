import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IOnePasswordClient } from '../types.js';
import { parseOnePasswordUrl } from '../url-parser.js';
import { unlockItem, isItemUnlocked, getUnlockedItemCount } from '../unlocked-items.js';

const PARAM_DESCRIPTIONS = {
  url: 'A 1Password URL (e.g., https://start.1password.com/open/i?a=...&v=...&i=...&h=...). Copy this from the 1Password app by right-clicking an item and selecting "Copy Link".',
} as const;

export const UnlockItemSchema = z.object({
  url: z.string().url().describe(PARAM_DESCRIPTIONS.url),
});

const TOOL_DESCRIPTION = `Unlock a 1Password item for credential access by providing its 1Password URL.

By default, the get_item tool returns item metadata but redacts sensitive credential fields (passwords, secrets, etc.) for security. To retrieve the actual credentials, you must first "unlock" the item using this tool.

**How to use:**
1. In the 1Password app, right-click the item you want to access
2. Select "Copy Link" to copy the item's URL
3. Paste the URL into this tool to unlock the item
4. Now get_item will return the full credentials for this item

**URL format:** https://start.1password.com/open/i?a=ACCOUNT&v=VAULT&i=ITEM&h=HOST

**Security:**
- Items remain unlocked only for the current session (resets on server restart)
- This provides an explicit consent mechanism before exposing credentials

**Returns:**
- Confirmation of the unlocked item with its title`;

/**
 * Tool for unlocking items via 1Password URL
 */
export function unlockItemTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_unlock_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.url,
        },
      },
      required: ['url'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UnlockItemSchema.parse(args);

        // Parse the 1Password URL
        const parsed = parseOnePasswordUrl(validatedArgs.url);
        if (!parsed) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Invalid 1Password URL. Expected format: https://start.1password.com/open/i?a=ACCOUNT&v=VAULT&i=ITEM&h=HOST\n\nProvided URL: ${validatedArgs.url}`,
              },
            ],
            isError: true,
          };
        }

        const { itemId, vaultId } = parsed;

        // Check if already unlocked (need to fetch title first for message)
        if (isItemUnlocked(itemId)) {
          // Try to get the title for a better message
          const client = clientFactory();
          let itemTitle = 'the item';
          try {
            const item = await client.getItem(itemId, vaultId);
            itemTitle = `"${item.title}"`;
          } catch {
            // Item might not be accessible
          }
          return {
            content: [
              {
                type: 'text',
                text: `${itemTitle} is already unlocked. You can now use get_item to retrieve its credentials.`,
              },
            ],
          };
        }

        // Verify the item exists by fetching it (optional but provides better UX)
        const client = clientFactory();
        let itemTitle = 'Unknown';
        try {
          const item = await client.getItem(itemId, vaultId);
          itemTitle = item.title;
        } catch {
          // Item might not be accessible, but we'll still unlock it
          // The error will be caught when they try to get_item
        }

        // Unlock the item
        unlockItem(itemId);

        return {
          content: [
            {
              type: 'text',
              text:
                `✓ Item unlocked successfully!\n\n` +
                `**Title:** ${itemTitle}\n\n` +
                `You can now use \`onepassword_get_item\` with the item title "${itemTitle}" to retrieve the full credentials.\n\n` +
                `Currently ${getUnlockedItemCount()} item(s) unlocked in this session.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error unlocking item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
