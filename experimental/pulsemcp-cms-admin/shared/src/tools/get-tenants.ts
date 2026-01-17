import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter by slug',
  is_admin: 'Filter by admin status (true/false)',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetTenantsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  is_admin: z.boolean().optional().describe(PARAM_DESCRIPTIONS.is_admin),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getTenants(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_tenants',
    description: `Retrieve a paginated list of tenants. Tenants represent organizations or users that have access to the PulseMCP platform.

Example response:
{
  "tenants": [
    {
      "id": 123,
      "slug": "acme-corp",
      "is_admin": false,
      "enrichments": { "com.pulsemcp/server": {...} }
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 150 }
}

Use cases:
- Browse all tenants in the system
- Search for specific tenants by slug
- Find admin tenants for elevated access review
- Review tenant configurations and enrichments`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        is_admin: { type: 'boolean', description: PARAM_DESCRIPTIONS.is_admin },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetTenantsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getTenants(validatedArgs);

        let content = `Found ${response.tenants.length} tenants`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, tenant] of response.tenants.entries()) {
          content += `${index + 1}. **${tenant.slug}** (ID: ${tenant.id})\n`;
          content += `   Admin: ${tenant.is_admin ? 'Yes' : 'No'}\n`;
          if (tenant.enrichments && Object.keys(tenant.enrichments).length > 0) {
            content += `   Enrichments: ${Object.keys(tenant.enrichments).join(', ')}\n`;
          }
          if (tenant.created_at) {
            content += `   Created: ${new Date(tenant.created_at).toLocaleDateString()}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching tenants: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
