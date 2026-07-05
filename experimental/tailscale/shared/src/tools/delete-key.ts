import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  key_id: 'The ID of the key to revoke/delete. Get this from list_keys.',
} as const;

const DeleteKeySchema = z.object({
  key_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.key_id),
});

export function deleteKey(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_key',
    description: `Revoke (delete) an auth key or API access token.

Permanently revokes a key. Devices already authenticated with a revoked auth key
stay connected, but the key can no longer be used to enroll new devices.

**Warning:**
- This action is irreversible
- Revoking an API access token immediately invalidates it

**Returns:**
- Confirmation of revocation

**Use cases:**
- Revoke a leaked or unused auth key
- Clean up expired or superseded keys`,
    inputSchema: {
      type: 'object',
      properties: {
        key_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.key_id,
        },
      },
      required: ['key_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteKeySchema.parse(args);
      const client = clientFactory();

      try {
        await client.deleteKey(validatedArgs.key_id);

        return {
          content: [
            {
              type: 'text',
              text: `## Key Revoked\n\nKey \`${validatedArgs.key_id}\` has been permanently revoked.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
