import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id_or_slug: 'The ID (number) or slug (string) of the secret to delete',
} as const;

const DeleteSecretSchema = z.object({
  id_or_slug: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.id_or_slug),
});

export function deleteSecret(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_secret',
    description: `Delete a secret by its ID or slug. This action is irreversible.

Warning: Deleting a secret that is in use by MCP servers may cause those servers to fail authentication.

Use cases:
- Remove obsolete secrets
- Clean up test data
- Remove secrets that were incorrectly created`,
    inputSchema: {
      type: 'object',
      properties: {
        id_or_slug: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.id_or_slug,
        },
      },
      required: ['id_or_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteSecretSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.deleteSecret(validatedArgs.id_or_slug);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted secret (${validatedArgs.id_or_slug}).\n\n${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting secret: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
