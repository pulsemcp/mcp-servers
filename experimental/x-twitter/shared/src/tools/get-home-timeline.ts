import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatTweetList } from '../utils/format.js';

const PARAM_DESCRIPTIONS = {
  max_results: 'Maximum number of tweets to return. Clamped to the X API range 5–100. Default: 20.',
  pagination_token:
    'Token from a previous response (meta.next_token) to fetch the next page of results.',
} as const;

export const GetHomeTimelineSchema = z.object({
  // Not `.int()`: the published inputSchema only says `number`, so a host may
  // pass a non-integer. clampMaxResults floors it rather than rejecting a
  // request the advertised contract permits.
  max_results: z.number().optional().describe(PARAM_DESCRIPTIONS.max_results),
  pagination_token: z.string().optional().describe(PARAM_DESCRIPTIONS.pagination_token),
});

const TOOL_DESCRIPTION = `Get the authenticated user's home timeline (reverse chronological).

Returns the most recent tweets from accounts the authenticated user follows (via GET /2/users/:id/timelines/reverse_chronological). Each tweet includes its author, creation time, engagement metrics, referenced tweets, and full text for long "note" tweets.

**Parameters:**
- max_results: Number of tweets to return (5–100, default 20)
- pagination_token: Fetch the next page using meta.next_token from a prior call

**Use cases:**
- See what the followed accounts are posting right now
- Page through recent timeline activity

**Note:** This is a read-only tool. It cannot post, like, or retweet.`;

export function getHomeTimelineTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_home_timeline',
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
        const parsed = GetHomeTimelineSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.getHomeTimeline({
          maxResults: parsed.max_results,
          paginationToken: parsed.pagination_token,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatTweetList(response, 'The home timeline returned no tweets.'),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting home timeline: ${
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
