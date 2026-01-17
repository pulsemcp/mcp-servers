import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id_or_slug: 'The ID (number) or slug (string) of the secret to retrieve',
} as const;

const GetSecretSchema = z.object({
  id_or_slug: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.id_or_slug),
});

export function getSecret(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_secret',
    description: `Retrieve a single secret by its ID or slug. Returns detailed information including which MCP servers use it.

Example response:
{
  "id": 123,
  "slug": "github-api-key",
  "onepassword_item_id": "op://vault/item/field",
  "title": "GitHub API Key",
  "description": "API key for GitHub integrations",
  "mcp_servers_count": 3,
  "mcp_server_slugs": ["github", "pr-reviewer", "issue-tracker"]
}

Use cases:
- Get detailed information about a specific secret
- Find which MCP servers use a secret
- Review secret configuration before updating`,
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
      const validatedArgs = GetSecretSchema.parse(args);
      const client = clientFactory();

      try {
        const secret = await client.getSecret(validatedArgs.id_or_slug);

        let content = `**Secret Details**\n\n`;
        content += `**ID:** ${secret.id}\n`;
        content += `**Slug:** ${secret.slug}\n`;
        content += `**1Password Item:** ${secret.onepassword_item_id}\n`;

        if (secret.title) {
          content += `**Title:** ${secret.title}\n`;
        }
        if (secret.description) {
          content += `**Description:** ${secret.description}\n`;
        }

        if (secret.mcp_servers_count !== undefined) {
          content += `**Used by:** ${secret.mcp_servers_count} server(s)\n`;
          if (secret.mcp_server_slugs && secret.mcp_server_slugs.length > 0) {
            content += `**Servers:** ${secret.mcp_server_slugs.join(', ')}\n`;
          }
        }

        if (secret.created_at) {
          content += `**Created:** ${secret.created_at}\n`;
        }
        if (secret.updated_at) {
          content += `**Updated:** ${secret.updated_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching secret: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
