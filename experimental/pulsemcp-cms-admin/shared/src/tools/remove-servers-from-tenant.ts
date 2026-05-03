import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  tenant: 'Tenant ID (number) or slug (string) to remove servers from.',
  mcp_servers:
    "Array of MCP server IDs (numbers) or slugs (strings) to remove from the tenant's recommendation list. Touched associations are soft-deleted (preserving the customization history); untouched associations are hard-deleted.",
} as const;

const RemoveServersFromTenantSchema = z.object({
  tenant: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.tenant),
  mcp_servers: z
    .array(z.union([z.number(), z.string()]))
    .min(1)
    .describe(PARAM_DESCRIPTIONS.mcp_servers),
});

export function removeServersFromTenant(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'remove_servers_from_tenant',
    description: `Remove MCP servers from a tenant's recommendation list.

This is a convenience inverse of add_servers_to_tenant — it accepts only the tenant and a list of servers to remove. For combined add/remove/restore in a single transactional call, use add_servers_to_tenant.

This tool only changes the tenant's recommendation list (TenantsMcpServer rows). The underlying MCP server's public listing is NOT affected.

Outcome behavior:
- Untouched associations: hard-deleted (row removed entirely; outcome "hard_deleted")
- Touched associations: soft-deleted (status set to "deleted", row preserved; outcome "soft_deleted")

The response includes:
- removed: servers detached, with outcome
- skipped/unresolved_identifiers: as for add_servers_to_tenant

Use cases:
- Curate a tenant's recommendation list by trimming servers
- Cleanly remove servers from a tenant without affecting public listings`,
    inputSchema: {
      type: 'object',
      properties: {
        tenant: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.tenant,
        },
        mcp_servers: {
          type: 'array',
          items: { oneOf: [{ type: 'number' }, { type: 'string' }] },
          description: PARAM_DESCRIPTIONS.mcp_servers,
          minItems: 1,
        },
      },
      required: ['tenant', 'mcp_servers'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = RemoveServersFromTenantSchema.parse(args);
        const client = clientFactory();

        const result = await client.bulkUpdateTenantServers(validatedArgs.tenant, {
          remove_server_identifiers: validatedArgs.mcp_servers,
        });

        let content = `**Tenant servers updated** (tenant=${result.tenant.slug}, id=${result.tenant.id})\n\n`;
        content += `- Removed: ${result.removed.length}\n`;
        content += `- Skipped: ${result.skipped.length}\n`;
        content += `- Unresolved identifiers: ${result.unresolved_identifiers.length}\n`;

        if (result.removed.length > 0) {
          content += `\n**Removed:**\n`;
          for (const item of result.removed) {
            const assocPart =
              item.association_id != null ? `, association_id=${item.association_id}` : '';
            content += `- ${item.mcp_server_slug} (server_id=${item.mcp_server_id}${assocPart}, outcome=${item.outcome})\n`;
          }
        }
        if (result.skipped.length > 0) {
          content += `\n**Skipped:**\n`;
          for (const item of result.skipped) {
            const label = item.mcp_server_slug || item.mcp_server_id || item.association_id;
            content += `- ${label} — reason: ${item.reason}\n`;
          }
        }
        if (result.unresolved_identifiers.length > 0) {
          content += `\n**Unresolved identifiers:** ${result.unresolved_identifiers.join(', ')}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing tenant servers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
