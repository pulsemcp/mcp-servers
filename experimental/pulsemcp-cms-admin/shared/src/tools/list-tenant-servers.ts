import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  tenant: 'Tenant ID (number) or slug (string)',
  status: 'Association status filter: "active" (default), "deleted" (soft-deleted only), or "all"',
  limit: 'Results per page, range 1-100 (default 30)',
  offset: 'Pagination offset (default 0)',
} as const;

const ListTenantServersSchema = z.object({
  tenant: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.tenant),
  status: z.enum(['active', 'deleted', 'all']).optional().describe(PARAM_DESCRIPTIONS.status),
  limit: z.number().int().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().int().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function listTenantServers(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_tenant_servers',
    description: `List a tenant's recommended MCP server associations (TenantsMcpServer rows).

Use this to inspect which public MCP servers are currently part of a tenant's recommendation list, before/after calling add_servers_to_tenant or remove_servers_from_tenant.

Each association row includes:
- id: TenantsMcpServer association ID (use this for restore_association_ids in add_servers_to_tenant)
- mcp_server_id / mcp_server_slug: the underlying public MCP server
- status: "active" or "deleted" (soft-deleted)
- server_json_selection: which server.json variant the tenant pins (always "unofficial" for entries created via these tools)
- touched / first_touched_at: whether the tenant's customization touched this association

Use cases:
- Audit a tenant's recommendation list
- Find soft-deleted associations to restore
- Verify the result of a recent add/remove call`,
    inputSchema: {
      type: 'object',
      properties: {
        tenant: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.tenant,
        },
        status: {
          type: 'string',
          enum: ['active', 'deleted', 'all'],
          description: PARAM_DESCRIPTIONS.status,
        },
        limit: { type: 'number', description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', description: PARAM_DESCRIPTIONS.offset },
      },
      required: ['tenant'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListTenantServersSchema.parse(args);
        const client = clientFactory();

        const response = await client.listTenantServers(validatedArgs.tenant, {
          status: validatedArgs.status,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        const { data, pagination } = response;
        const statusLabel = validatedArgs.status || 'active';

        let content = `**Tenant Server Associations** (status=${statusLabel})\n\n`;
        content += `Showing ${data.length} of ${pagination.total_count} associations (page ${pagination.current_page} of ${pagination.total_pages}).\n\n`;

        if (data.length === 0) {
          content += `_No associations matching this filter._\n`;
        } else {
          for (const row of data) {
            content += `- **${row.mcp_server_slug}** (server_id=${row.mcp_server_id}, association_id=${row.id})\n`;
            content += `  status=${row.status}, server_json_selection=${row.server_json_selection}, touched=${row.touched}\n`;
            if (row.first_touched_at) {
              content += `  first_touched_at=${row.first_touched_at}\n`;
            }
          }
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing tenant servers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
