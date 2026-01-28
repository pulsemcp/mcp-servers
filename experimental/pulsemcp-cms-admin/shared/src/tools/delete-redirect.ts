import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the redirect to delete',
} as const;

const DeleteRedirectSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function deleteRedirect(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_redirect',
    description: `Delete a URL redirect by its ID. This action is irreversible.

Use cases:
- Remove duplicate or outdated redirects
- Clean up test data
- Remove redirects that were incorrectly created`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteRedirectSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.deleteRedirect(validatedArgs.id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted redirect (ID: ${validatedArgs.id}).\n\n${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting redirect: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
