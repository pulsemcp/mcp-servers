import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the redirect to retrieve',
} as const;

const GetRedirectSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function getRedirect(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_redirect',
    description: `Retrieve a single URL redirect by its ID. Returns detailed information including the from/to paths and status.

Example response:
{
  "id": 123,
  "from": "/old-page",
  "to": "/new-page",
  "status": "active",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}

Use cases:
- Get detailed information about a specific redirect
- Check the current state of a redirect before updating
- Verify redirect configuration`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetRedirectSchema.parse(args);
      const client = clientFactory();

      try {
        const redirect = await client.getRedirect(validatedArgs.id);

        let content = `**Redirect Details**\n\n`;
        content += `**ID:** ${redirect.id}\n`;
        content += `**From:** ${redirect.from}\n`;
        content += `**To:** ${redirect.to}\n`;
        content += `**Status:** ${redirect.status}\n`;

        if (redirect.created_at) {
          content += `**Created:** ${redirect.created_at}\n`;
        }
        if (redirect.updated_at) {
          content += `**Updated:** ${redirect.updated_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching redirect: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
