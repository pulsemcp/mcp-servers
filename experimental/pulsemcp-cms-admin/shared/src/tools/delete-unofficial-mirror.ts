import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the unofficial mirror to delete',
} as const;

const DeleteUnofficialMirrorSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function deleteUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_unofficial_mirror',
    description: `Delete an unofficial mirror by its ID. This action is irreversible.

Use cases:
- Remove duplicate or outdated unofficial mirrors
- Clean up test data
- Remove mirrors that were incorrectly created`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.deleteUnofficialMirror(validatedArgs.id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted unofficial mirror (ID: ${validatedArgs.id}).\n\n${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting unofficial mirror: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
