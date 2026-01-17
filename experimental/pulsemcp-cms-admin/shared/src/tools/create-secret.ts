import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  slug: 'Unique slug identifier for the secret (e.g., "github-api-key")',
  onepassword_item_id: '1Password item reference (e.g., "op://vault/item/field")',
  title: 'Human-readable title for the secret',
  description: "Optional description explaining the secret's purpose",
} as const;

const CreateSecretSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
  onepassword_item_id: z.string().describe(PARAM_DESCRIPTIONS.onepassword_item_id),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

export function createSecret(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_secret',
    description: `Create a new secret entry. Secrets are 1Password item references that can be used by MCP servers for authentication.

Example request:
{
  "slug": "github-api-key",
  "onepassword_item_id": "op://PulseMCP/GitHub API Token/credential",
  "title": "GitHub API Key",
  "description": "API key for GitHub integrations"
}

Use cases:
- Register a new 1Password secret for use with MCP servers
- Set up authentication credentials for new integrations
- Document secrets with titles and descriptions`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
        onepassword_item_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.onepassword_item_id,
        },
        title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: ['slug', 'onepassword_item_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateSecretSchema.parse(args);
      const client = clientFactory();

      try {
        const secret = await client.createSecret({
          slug: validatedArgs.slug,
          onepassword_item_id: validatedArgs.onepassword_item_id,
          title: validatedArgs.title,
          description: validatedArgs.description,
        });

        let content = `Successfully created secret!\n\n`;
        content += `**ID:** ${secret.id}\n`;
        content += `**Slug:** ${secret.slug}\n`;
        content += `**1Password Item:** ${secret.onepassword_item_id}\n`;
        if (secret.title) {
          content += `**Title:** ${secret.title}\n`;
        }
        if (secret.description) {
          content += `**Description:** ${secret.description}\n`;
        }
        if (secret.created_at) {
          content += `**Created:** ${secret.created_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating secret: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
