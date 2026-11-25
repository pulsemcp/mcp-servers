import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  tweet_id: "The id of the tweet to remove from the authenticated user's bookmarks.",
} as const;

export const RemoveBookmarkSchema = z.object({
  tweet_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.tweet_id),
});

const TOOL_DESCRIPTION = `Remove a tweet from the authenticated user's bookmarks.

Deletes a tweet from the authenticated user's bookmarks (via DELETE /2/users/:id/bookmarks/:tweet_id). Bookmarks are PRIVATE — this only removes the tweet from your own saved list and does not affect the tweet or its author in any way.

**Parameters:**
- tweet_id: The id of the tweet to un-bookmark

**Use cases:**
- Clear a bookmark once you've processed or drafted from it

**Note:** This is a private write. It only affects your own bookmark collection. Requires the bookmark.write OAuth scope.`;

export function removeBookmarkTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'remove_bookmark',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tweet_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tweet_id,
        },
      },
      required: ['tweet_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = RemoveBookmarkSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.removeBookmark(parsed.tweet_id);

        // X returns `{ data: { bookmarked: false } }` on a successful removal.
        if (response.data && response.data.bookmarked === false) {
          return {
            content: [
              {
                type: 'text',
                text: `Removed tweet ${parsed.tweet_id} from bookmarks.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Failed to remove bookmark for tweet ${parsed.tweet_id}.${
                response.errors
                  ? `\n\nAPI errors:\n${JSON.stringify(response.errors, null, 2)}`
                  : ''
              }`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing bookmark: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
