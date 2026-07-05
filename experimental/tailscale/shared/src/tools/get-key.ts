import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  key_id: 'The ID of the key to retrieve. Get this from list_keys.',
} as const;

const GetKeySchema = z.object({
  key_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.key_id),
});

export function getKey(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_key',
    description: `Get metadata about a single auth key or API access token.

Returns the metadata for one key. Secret key material is NOT returned.

**Returns:**
- The key object: id, creation/expiry times, capabilities, and description

**Use cases:**
- Inspect a key's capabilities (reusable, ephemeral, preauthorized, tags)
- Check expiry before relying on a key`,
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
      const validatedArgs = GetKeySchema.parse(args);
      const client = clientFactory();

      try {
        const key = await client.getKey(validatedArgs.key_id);

        const content =
          `## Key: ${key.id}\n\n` + '```json\n' + JSON.stringify(key, null, 2) + '\n```';

        return {
          content: [{ type: 'text', text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
