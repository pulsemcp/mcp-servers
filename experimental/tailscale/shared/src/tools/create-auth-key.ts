import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  reusable: 'Whether the key can be used to authenticate more than one device. Defaults to false.',
  ephemeral:
    'Whether devices authenticated with this key are ephemeral (automatically removed when they go offline). Defaults to false.',
  preauthorized:
    'Whether devices authenticated with this key are automatically authorized (skip manual device approval). Defaults to false.',
  tags: 'ACL tags to apply to devices authenticated with this key (e.g. ["tag:ci"]). Tags must be defined in the tailnet policy file. Required if the tailnet enforces tagged auth keys.',
  expiry_seconds:
    'Number of seconds until the key expires. Defaults to the tailnet default (typically 90 days) if omitted.',
  description: 'A human-readable description for the key.',
} as const;

const CreateAuthKeySchema = z.object({
  reusable: z.boolean().optional().describe(PARAM_DESCRIPTIONS.reusable),
  ephemeral: z.boolean().optional().describe(PARAM_DESCRIPTIONS.ephemeral),
  preauthorized: z.boolean().optional().describe(PARAM_DESCRIPTIONS.preauthorized),
  tags: z
    .array(z.string().regex(/^tag:/, 'Each tag must start with "tag:"'))
    .optional()
    .describe(PARAM_DESCRIPTIONS.tags),
  expiry_seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(PARAM_DESCRIPTIONS.expiry_seconds),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

export function createAuthKey(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_auth_key',
    description: `Create a new auth key for the tailnet.

Creates a device auth key that can be used to join devices to the tailnet.

**Important:** The secret key material is returned ONLY once, in this response.
Store it securely — it cannot be retrieved again.

**Returns:**
- The created key, including the secret key value and its capabilities

**Use cases:**
- Provision a key for automated/CI device enrollment
- Create a pre-authorized, tagged key for ephemeral workloads`,
    inputSchema: {
      type: 'object',
      properties: {
        reusable: { type: 'boolean', description: PARAM_DESCRIPTIONS.reusable },
        ephemeral: { type: 'boolean', description: PARAM_DESCRIPTIONS.ephemeral },
        preauthorized: { type: 'boolean', description: PARAM_DESCRIPTIONS.preauthorized },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
        expiry_seconds: { type: 'number', description: PARAM_DESCRIPTIONS.expiry_seconds },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateAuthKeySchema.parse(args);
      const client = clientFactory();

      try {
        const key = await client.createAuthKey({
          reusable: validatedArgs.reusable,
          ephemeral: validatedArgs.ephemeral,
          preauthorized: validatedArgs.preauthorized,
          tags: validatedArgs.tags,
          expirySeconds: validatedArgs.expiry_seconds,
          description: validatedArgs.description,
        });

        let content = '## Auth Key Created\n\n';
        content += `**ID:** ${key.id}\n`;
        if (key.expires) content += `**Expires:** ${key.expires}\n`;
        content += '\n⚠️ **Save the secret key now — it will not be shown again:**\n\n';
        content += '```\n';
        content += key.key ?? '(no key returned)';
        content += '\n```';

        return {
          content: [{ type: 'text', text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating auth key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
