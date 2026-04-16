import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  slug: 'Unique slug identifier for the new tenant (e.g., "acme-corp")',
} as const;

const CreateTenantSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
});

export function createTenant(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_tenant',
    description: `Create a new tenant for sub-registry provisioning.

Example request:
{
  "slug": "acme-corp"
}

Use cases:
- Provision a new sub-registry tenant
- Set up a new organization in the PulseMCP platform`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
      },
      required: ['slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateTenantSchema.parse(args);
      const client = clientFactory();

      try {
        const tenant = await client.createTenant({ slug: validatedArgs.slug });

        let content = `Successfully created tenant!\n\n`;
        content += `**ID:** ${tenant.id}\n`;
        content += `**Slug:** ${tenant.slug}\n`;
        content += `**Admin:** ${tenant.is_admin ? 'Yes' : 'No'}\n`;
        if (tenant.enrichments && Object.keys(tenant.enrichments).length > 0) {
          content += `**Enrichments:** ${Object.keys(tenant.enrichments).join(', ')}\n`;
        }
        if (tenant.created_at) {
          content += `**Created:** ${tenant.created_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating tenant: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
