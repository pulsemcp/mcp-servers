import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatTweetList } from '../utils/format.js';

const PARAM_DESCRIPTIONS = {
  username:
    'The X (Twitter) handle whose tweets to fetch, with or without a leading ' +
    '"@" (e.g. "pulsemcp"). Omit to fetch the authenticated user\'s own tweets.',
  max_results: 'Maximum number of tweets to return. Clamped to the X API range 5–100. Default: 20.',
  exclude_replies: 'Exclude replies from the results. Default: false.',
  exclude_retweets: 'Exclude retweets from the results. Default: false.',
  pagination_token:
    'Token from a previous response (meta.next_token) to fetch the next page of results.',
} as const;

export const GetUserTweetsSchema = z.object({
  username: z.string().optional().describe(PARAM_DESCRIPTIONS.username),
  // Not `.int()`: the published inputSchema only says `number`, so a host may
  // pass a non-integer. clampMaxResults floors it rather than rejecting a
  // request the advertised contract permits.
  max_results: z.number().optional().describe(PARAM_DESCRIPTIONS.max_results),
  exclude_replies: z.boolean().optional().describe(PARAM_DESCRIPTIONS.exclude_replies),
  exclude_retweets: z.boolean().optional().describe(PARAM_DESCRIPTIONS.exclude_retweets),
  pagination_token: z.string().optional().describe(PARAM_DESCRIPTIONS.pagination_token),
});

const TOOL_DESCRIPTION = `Get a user's recent tweet history.

Returns a user's own tweets in reverse-chronological order (via GET /2/users/:id/tweets). Unlike search_recent_tweets — which only covers the last 7 days — this reaches back through a user's timeline (the API exposes up to ~3,200 of the most recent tweets via pagination). Each tweet includes its author, creation time, engagement metrics, and full text for long "note" tweets.

**Parameters:**
- username: Whose tweets to fetch (with or without "@"). Omit for the authenticated user's own tweets.
- max_results: Number of tweets to return (5–100, default 20)
- exclude_replies: Omit replies (default false)
- exclude_retweets: Omit retweets (default false)
- pagination_token: Fetch the next page using meta.next_token from a prior call

**Use cases:**
- Read an account's recent posts (e.g. an influencer you may quote-tweet)
- Page back further than the 7-day recent-search window allows

**Note:** This is a read-only tool.`;

export function getUserTweetsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_user_tweets',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        username: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.username,
        },
        max_results: {
          type: 'number',
          default: 20,
          description: PARAM_DESCRIPTIONS.max_results,
        },
        exclude_replies: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.exclude_replies,
        },
        exclude_retweets: {
          type: 'boolean',
          default: false,
          description: PARAM_DESCRIPTIONS.exclude_retweets,
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
        const parsed = GetUserTweetsSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.getUserTweets({
          username: parsed.username,
          maxResults: parsed.max_results,
          excludeReplies: parsed.exclude_replies,
          excludeRetweets: parsed.exclude_retweets,
          paginationToken: parsed.pagination_token,
        });

        const who = parsed.username ? `@${parsed.username.replace(/^@/, '')}` : 'this account';
        return {
          content: [
            {
              type: 'text',
              text: formatTweetList(response, `No tweets found for ${who}.`),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting user tweets: ${
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
