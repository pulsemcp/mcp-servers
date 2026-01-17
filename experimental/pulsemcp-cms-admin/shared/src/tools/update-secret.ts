import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id_or_slug: 'The ID (number) or slug (string) of the secret to update',
  slug: 'Updated slug identifier',
  onepassword_item_id: 'Updated 1Password item reference',
  title: 'Updated human-readable title',
  description: 'Updated description',
} as const;

const UpdateSecretSchema = z.object({
  id_or_slug: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.id_or_slug),
  slug: z.string().optional().describe(PARAM_DESCRIPTIONS.slug),
  onepassword_item_id: z.string().optional().describe(PARAM_DESCRIPTIONS.onepassword_item_id),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

export function updateSecret(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_secret',
    description: `Update an existing secret by its ID or slug. Only provided fields will be updated.

Example request:
{
  "id_or_slug": "github-api-key",
  "title": "GitHub API Key (Updated)",
  "description": "Updated description for the API key"
}

Use cases:
- Update a secret's 1Password reference
- Change a secret's slug or title
- Add or modify the description`,
    inputSchema: {
      type: 'object',
      properties: {
        id_or_slug: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.id_or_slug,
        },
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
        onepassword_item_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.onepassword_item_id,
        },
        title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: ['id_or_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateSecretSchema.parse(args);
      const client = clientFactory();

      try {
        const { id_or_slug, ...params } = validatedArgs;

        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        const secret = await client.updateSecret(id_or_slug, params);

        let content = `Successfully updated secret!\n\n`;
        content += `**ID:** ${secret.id}\n`;
        content += `**Slug:** ${secret.slug}\n`;
        content += `**1Password Item:** ${secret.onepassword_item_id}\n`;
        if (secret.title) {
          content += `**Title:** ${secret.title}\n`;
        }
        if (secret.description) {
          content += `**Description:** ${secret.description}\n`;
        }
        if (secret.updated_at) {
          content += `**Updated:** ${secret.updated_at}\n`;
        }

        content += `\n**Fields updated:**\n`;
        Object.keys(params).forEach((field) => {
          content += `- ${field}\n`;
        });

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating secret: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
