import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatTweet } from '../utils/format.js';
import type { XUser } from '../types.js';

const PARAM_DESCRIPTIONS = {
  ids:
    'One or more tweet ids to look up. Accepts an array of id strings, or a ' +
    'single comma-separated string. Maximum 100 ids per call.',
} as const;

export const GetTweetsSchema = z.object({
  ids: z.union([z.array(z.string().min(1)), z.string().min(1)]).describe(PARAM_DESCRIPTIONS.ids),
});

const TOOL_DESCRIPTION = `Look up one or more tweets by id.

Fetches full details for specific tweets (via GET /2/tweets?ids=): author, creation time, engagement metrics, referenced tweets, and full text for long "note" tweets.

**Parameters:**
- ids: Tweet ids to look up — an array of strings, or a single comma-separated string (max 100)

**Use cases:**
- Resolve a referenced_tweets id from a timeline/search result to its full content
- Fetch the current metrics for known tweets

**Note:** This is a read-only tool. It cannot post, reply to, or modify tweets.`;

function normalizeIds(ids: string[] | string): string[] {
  const arr = Array.isArray(ids) ? ids : ids.split(',');
  return arr.map((id) => id.trim()).filter((id) => id.length > 0);
}

export function getTweetsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_tweets',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        ids: {
          oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.ids,
        },
      },
      required: ['ids'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetTweetsSchema.parse(args ?? {});
        const ids = normalizeIds(parsed.ids);

        if (ids.length === 0) {
          return {
            content: [{ type: 'text', text: 'No tweet ids provided.' }],
            isError: true,
          };
        }
        if (ids.length > 100) {
          return {
            content: [
              {
                type: 'text',
                text: `Too many ids (${ids.length}). The X API accepts at most 100 per lookup.`,
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();
        const response = await client.getTweets(ids);

        const tweets = response.data ?? [];
        if (tweets.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No tweets found for the given id(s).${
                  response.errors
                    ? `\n\nAPI errors:\n${JSON.stringify(response.errors, null, 2)}`
                    : ''
                }`,
              },
            ],
          };
        }

        const authors = new Map<string, XUser>();
        for (const user of response.includes?.users ?? []) {
          authors.set(user.id, user);
        }

        const body = tweets.map((t) => formatTweet(t, authors)).join('\n\n');
        const missing = response.errors?.length
          ? `\n\nSome ids could not be resolved:\n${JSON.stringify(response.errors, null, 2)}`
          : '';

        return {
          content: [{ type: 'text', text: `${tweets.length} tweet(s):\n\n${body}${missing}` }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error looking up tweets: ${
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
