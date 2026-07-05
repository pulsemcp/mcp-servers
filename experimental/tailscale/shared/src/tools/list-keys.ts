import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  all: "When true, include keys owned by all users of the tailnet (requires appropriate scope). Defaults to false (only the credential owner's keys).",
} as const;

const ListKeysSchema = z.object({
  all: z.boolean().optional().describe(PARAM_DESCRIPTIONS.all),
});

export function listKeys(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_keys',
    description: `List auth keys and API access tokens for the tailnet.

Returns the keys associated with the tailnet. Secret key material is NOT
returned — only key IDs and metadata.

**Returns:**
- keys: Array of keys with id, creation/expiry times, capabilities, and description

**Use cases:**
- Audit outstanding auth keys and API tokens
- Find a key ID to inspect or revoke
- Check key expiry`,
    inputSchema: {
      type: 'object',
      properties: {
        all: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.all,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListKeysSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.listKeys(validatedArgs.all);

        if (!response.keys || response.keys.length === 0) {
          return {
            content: [{ type: 'text', text: 'No keys found for the tailnet.' }],
          };
        }

        let content = `## Keys (${response.keys.length})\n\n`;
        for (const key of response.keys) {
          content += `### ${key.id}\n`;
          if (key.description) content += `- **Description:** ${key.description}\n`;
          if (key.created) content += `- **Created:** ${key.created}\n`;
          if (key.expires) content += `- **Expires:** ${key.expires}\n`;
          if (key.revoked) content += `- **Revoked:** ${key.revoked}\n`;
          content += '\n';
        }

        return {
          content: [{ type: 'text', text: content.trim() }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing keys: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
