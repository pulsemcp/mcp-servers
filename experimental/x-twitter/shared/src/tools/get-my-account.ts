import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { formatUser } from '../utils/format.js';

export const GetMyAccountSchema = z.object({});

const TOOL_DESCRIPTION = `Get the authenticated X (Twitter) account.

Returns the profile of the user whose OAuth credentials this server is configured with (via GET /2/users/me): username, display name, bio, join date, and public metrics (followers, following, tweet count).

**Parameters:** none

**Use cases:**
- Confirm which account the server is acting as
- Retrieve the authenticated user's id for reference

**Note:** This is a read-only tool. It cannot post, follow, or modify anything.`;

export function getMyAccountTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_my_account',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        GetMyAccountSchema.parse(args ?? {});
        const client = clientFactory();
        const response = await client.getMe();

        if (!response.data) {
          return {
            content: [
              {
                type: 'text',
                text: `Could not retrieve the authenticated account.${
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
              text: `Error getting authenticated account: ${
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
