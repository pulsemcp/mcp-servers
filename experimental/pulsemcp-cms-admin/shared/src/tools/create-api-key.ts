import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { ApiKeyPermissionLevel } from '../types.js';

const PARAM_DESCRIPTIONS = {
  tenant_slug: 'The slug of the tenant to create the API key for',
  name: 'Optional display name for the API key',
  permission_level:
    'Permission level for the key: read_only, read_and_upsert, or full_access. Defaults to full_access.',
} as const;

const CreateApiKeySchema = z.object({
  tenant_slug: z.string().describe(PARAM_DESCRIPTIONS.tenant_slug),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  permission_level: z
    .enum(['read_only', 'read_and_upsert', 'full_access'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.permission_level),
});

export function createApiKey(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_api_key',
    description: `Create an API key for a specified tenant. Returns the raw key value, which is only available at creation time.

Example request:
{
  "tenant_slug": "acme-corp",
  "name": "Production Key",
  "permission_level": "read_and_upsert"
}

Use cases:
- Provision API access for a new tenant
- Create keys with specific permission levels for different use cases
- Generate read-only keys for monitoring integrations`,
    inputSchema: {
      type: 'object',
      properties: {
        tenant_slug: { type: 'string', description: PARAM_DESCRIPTIONS.tenant_slug },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        permission_level: {
          type: 'string',
          enum: ['read_only', 'read_and_upsert', 'full_access'],
          description: PARAM_DESCRIPTIONS.permission_level,
        },
      },
      required: ['tenant_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateApiKeySchema.parse(args);
      const client = clientFactory();

      try {
        const apiKey = await client.createApiKey({
          tenant_slug: validatedArgs.tenant_slug,
          name: validatedArgs.name,
          permission_level: validatedArgs.permission_level as ApiKeyPermissionLevel | undefined,
        });

        let content = `Successfully created API key!\n\n`;
        content += `**ID:** ${apiKey.id}\n`;
        if (apiKey.name) {
          content += `**Name:** ${apiKey.name}\n`;
        }
        content += `**Tenant:** ${apiKey.tenant_slug} (ID: ${apiKey.tenant_id})\n`;
        content += `**Permission Level:** ${apiKey.permission_level}\n`;
        content += `**Key:** \`${apiKey.key}\`\n`;
        content += `**Created:** ${apiKey.created_at}\n`;
        content += `\n> **Important:** Save this key now — it cannot be retrieved again.`;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating API key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
