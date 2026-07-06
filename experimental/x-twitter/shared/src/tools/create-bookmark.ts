import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  tweet_id: "The id of the tweet to add to the authenticated user's bookmarks.",
} as const;

export const CreateBookmarkSchema = z.object({
  tweet_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.tweet_id),
});

const TOOL_DESCRIPTION = `Bookmark a tweet for the authenticated user.

Adds a tweet to the authenticated user's bookmarks (via POST /2/users/:id/bookmarks). Bookmarks are PRIVATE — this does not post, like, retweet, or otherwise publicly interact with the tweet, and no one else can see it.

**Parameters:**
- tweet_id: The id of the tweet to bookmark

**Use cases:**
- Save a tweet surfaced by search or a timeline for later review

**Note:** This is a private write. It only affects your own bookmark collection. Requires the bookmark.write OAuth scope.`;

export function createBookmarkTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_bookmark',
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
        const parsed = CreateBookmarkSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.createBookmark(parsed.tweet_id);

        if (response.data?.bookmarked) {
          return {
            content: [{ type: 'text', text: `Bookmarked tweet ${parsed.tweet_id}.` }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Failed to bookmark tweet ${parsed.tweet_id}.${
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
              text: `Error creating bookmark: ${
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
