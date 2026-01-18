import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id_or_slug: 'The ID (number) or slug (string) of the tenant to retrieve',
} as const;

const GetTenantSchema = z.object({
  id_or_slug: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.id_or_slug),
});

export function getTenant(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_tenant',
    description: `Retrieve a single tenant by its ID or slug. Returns detailed information including enrichments.

Example response:
{
  "id": 123,
  "slug": "acme-corp",
  "is_admin": false,
  "enrichments": {
    "com.pulsemcp/server": { "servers": [...] },
    "com.pulsemcp/server-version": { "versions": [...] }
  }
}

Use cases:
- Get detailed information about a specific tenant
- Review tenant enrichments and configurations
- Check admin status for a tenant`,
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
      const validatedArgs = GetTenantSchema.parse(args);
      const client = clientFactory();

      try {
        const tenant = await client.getTenant(validatedArgs.id_or_slug);

        let content = `**Tenant Details**\n\n`;
        content += `**ID:** ${tenant.id}\n`;
        content += `**Slug:** ${tenant.slug}\n`;
        content += `**Admin:** ${tenant.is_admin ? 'Yes' : 'No'}\n`;

        if (tenant.created_at) {
          content += `**Created:** ${tenant.created_at}\n`;
        }
        if (tenant.updated_at) {
          content += `**Updated:** ${tenant.updated_at}\n`;
        }

        if (tenant.enrichments && Object.keys(tenant.enrichments).length > 0) {
          content += `\n**Enrichments:**\n\`\`\`json\n${JSON.stringify(tenant.enrichments, null, 2)}\n\`\`\``;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching tenant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
