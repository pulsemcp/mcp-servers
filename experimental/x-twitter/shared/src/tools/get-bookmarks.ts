import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatTweetList } from '../utils/format.js';

const PARAM_DESCRIPTIONS = {
  max_results:
    'Maximum number of bookmarked tweets to return. Clamped to the X API range 5–100. Default: 20.',
  pagination_token:
    'Token from a previous response (meta.next_token) to fetch the next page of results.',
} as const;

export const GetBookmarksSchema = z.object({
  // Not `.int()`: the published inputSchema only says `number`, so a host may
  // pass a non-integer. clampMaxResults floors it rather than rejecting a
  // request the advertised contract permits.
  max_results: z.number().optional().describe(PARAM_DESCRIPTIONS.max_results),
  pagination_token: z.string().optional().describe(PARAM_DESCRIPTIONS.pagination_token),
});

const TOOL_DESCRIPTION = `Get the authenticated user's bookmarked tweets.

Returns tweets the authenticated user has bookmarked (via GET /2/users/:id/bookmarks), newest first. Each tweet includes its author, creation time, engagement metrics, and full text for long "note" tweets.

**Parameters:**
- max_results: Number of tweets to return (5–100, default 20)
- pagination_token: Fetch the next page using meta.next_token from a prior call

**Use cases:**
- Review saved-for-later tweets
- Page through the full bookmark collection

**Note:** This is a read-only tool. It only reads bookmarks; it cannot add or remove them.`;

export function getBookmarksTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_bookmarks',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        max_results: {
          type: 'number',
          default: 20,
          description: PARAM_DESCRIPTIONS.max_results,
        },
        pagination_token: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.pagination_token,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetBookmarksSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.getBookmarks({
          maxResults: parsed.max_results,
          paginationToken: parsed.pagination_token,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatTweetList(response, 'No bookmarks found.'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting bookmarks: ${
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
