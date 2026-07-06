import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatTweetList } from '../utils/format.js';

const PARAM_DESCRIPTIONS = {
  query:
    'X search query. Supports the standard search operators, e.g. ' +
    '`from:pulsemcp`, `#mcp`, `"exact phrase"`, `-is:retweet lang:en`. ' +
    'Only tweets from the last 7 days are searchable.',
  max_results:
    'Maximum number of tweets to return. Clamped to the X recent-search range 10–100. Default: 20.',
  pagination_token:
    'Token from a previous response (meta.next_token) to fetch the next page of results.',
} as const;

export const SearchRecentTweetsSchema = z.object({
  query: z.string().min(1).describe(PARAM_DESCRIPTIONS.query),
  // Not `.int()`: the published inputSchema only says `number`, so a host may
  // pass a non-integer. clampMaxResults floors it rather than rejecting a
  // request the advertised contract permits.
  max_results: z.number().optional().describe(PARAM_DESCRIPTIONS.max_results),
  pagination_token: z.string().optional().describe(PARAM_DESCRIPTIONS.pagination_token),
});

const TOOL_DESCRIPTION = `Search recent public tweets (last 7 days).

Runs a search over public tweets from the past week (via GET /2/tweets/search/recent). Supports X's standard search operators. Each result includes its author, creation time, engagement metrics, and full text for long "note" tweets.

**Parameters:**
- query: The search query (supports operators like from:, #hashtag, "exact phrase", -is:retweet, lang:en)
- max_results: Number of tweets to return (10–100, default 20)
- pagination_token: Fetch the next page using meta.next_token from a prior call

**Use cases:**
- Find recent tweets mentioning a topic, hashtag, or account
- Monitor recent discussion on a subject

**Note:** This is a read-only tool and is limited to the last 7 days of public tweets.`;

export function searchRecentTweetsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'search_recent_tweets',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
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
      required: ['query'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SearchRecentTweetsSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.searchRecent({
          query: parsed.query,
          maxResults: parsed.max_results,
          paginationToken: parsed.pagination_token,
        });

        return {
          content: [
            {
              type: 'text',
              text: formatTweetList(response, `No recent tweets matched: ${parsed.query}`),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching recent tweets: ${
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
