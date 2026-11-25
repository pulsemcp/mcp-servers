import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatUser } from '../utils/format.js';

const PARAM_DESCRIPTIONS = {
  username:
    'The X (Twitter) handle to look up, with or without a leading "@" (e.g. "pulsemcp" or "@pulsemcp").',
} as const;

export const GetUserSchema = z.object({
  username: z.string().min(1).describe(PARAM_DESCRIPTIONS.username),
});

const TOOL_DESCRIPTION = `Look up an X (Twitter) user by username.

Returns the public profile for a handle (via GET /2/users/by/username/:username): display name, bio, join date, verification status, and public metrics.

**Parameters:**
- username: The handle to look up, with or without a leading "@"

**Use cases:**
- Resolve a handle to a user id (needed to interpret timeline/search author_id fields)
- Inspect a user's follower/following/tweet counts and bio

**Note:** This is a read-only tool. It cannot follow or modify anything.`;

export function getUserTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_user',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        username: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.username,
        },
      },
      required: ['username'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetUserSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.getUserByUsername(parsed.username);

        if (!response.data) {
          return {
            content: [
              {
                type: 'text',
                text: `No user found for "${parsed.username}".${
                  response.errors
                    ? `\n\nAPI errors:\n${JSON.stringify(response.errors, null, 2)}`
                    : ''
                }`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: formatUser(response.data) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error looking up user: ${
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
