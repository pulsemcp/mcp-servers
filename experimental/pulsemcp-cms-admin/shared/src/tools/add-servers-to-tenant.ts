import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  tenant: 'Tenant ID (number) or slug (string) to add servers to.',
  add_server_identifiers:
    'Array of MCP server IDs (numbers) or slugs (strings) to add to the tenant\'s recommendation list. Servers without an unofficial mirror are silently skipped (returned in `skipped` with reason "no_unofficial_mirror"). Already-active associations are skipped (reason "already_active").',
  remove_server_identifiers:
    'Optional array of MCP server IDs or slugs to remove from the tenant in the same call. Touched associations are soft-deleted; untouched associations are hard-deleted.',
  restore_association_ids:
    'Optional array of TenantsMcpServer association IDs to restore from a soft-deleted state. Use list_tenant_servers with status="deleted" to find these IDs.',
} as const;

const AddServersToTenantSchema = z
  .object({
    tenant: z.union([z.number(), z.string()]).describe(PARAM_DESCRIPTIONS.tenant),
    add_server_identifiers: z
      .array(z.union([z.number(), z.string()]))
      .optional()
      .describe(PARAM_DESCRIPTIONS.add_server_identifiers),
    remove_server_identifiers: z
      .array(z.union([z.number(), z.string()]))
      .optional()
      .describe(PARAM_DESCRIPTIONS.remove_server_identifiers),
    restore_association_ids: z
      .array(z.number())
      .optional()
      .describe(PARAM_DESCRIPTIONS.restore_association_ids),
  })
  .refine(
    (val) =>
      (val.add_server_identifiers && val.add_server_identifiers.length > 0) ||
      (val.remove_server_identifiers && val.remove_server_identifiers.length > 0) ||
      (val.restore_association_ids && val.restore_association_ids.length > 0),
    {
      message:
        'Must provide at least one of add_server_identifiers, remove_server_identifiers, or restore_association_ids',
    }
  );

export function addServersToTenant(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'add_servers_to_tenant',
    description: `Add MCP servers to a tenant's recommendation list. Optionally remove and restore associations in the same transactional call.

Servers are added with server_json_selection: "unofficial" — they always pin to the unofficial mirror's server.json. A server without an unofficial mirror cannot be added and will be reported in "skipped" with reason "no_unofficial_mirror".

This tool only changes the tenant's recommendation list (TenantsMcpServer rows). The underlying MCP server's public listing is NOT affected — public servers stay public and continue to appear in the public directory.

The response includes:
- added: servers newly attached to the tenant (outcome "created" or "restored_from_deleted")
- removed: servers detached (outcome "hard_deleted" if untouched, "soft_deleted" if the row had been customized)
- restored: associations restored from soft-deleted state via restore_association_ids
- skipped: identifiers that resolved to a server but were skipped with a reason
- unresolved_identifiers: identifiers that didn't match any existing MCP server

Use cases:
- Curate a tenant's recommended-servers list
- Bulk-add servers by slug or ID in one call
- Combine adds and removes atomically (e.g., swap one server for another)`,
    inputSchema: {
      type: 'object',
      properties: {
        tenant: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.tenant,
        },
        add_server_identifiers: {
          type: 'array',
          items: { oneOf: [{ type: 'number' }, { type: 'string' }] },
          description: PARAM_DESCRIPTIONS.add_server_identifiers,
        },
        remove_server_identifiers: {
          type: 'array',
          items: { oneOf: [{ type: 'number' }, { type: 'string' }] },
          description: PARAM_DESCRIPTIONS.remove_server_identifiers,
        },
        restore_association_ids: {
          type: 'array',
          items: { type: 'number' },
          description: PARAM_DESCRIPTIONS.restore_association_ids,
        },
      },
      required: ['tenant'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = AddServersToTenantSchema.parse(args);
        const client = clientFactory();

        const result = await client.bulkUpdateTenantServers(validatedArgs.tenant, {
          add_server_identifiers: validatedArgs.add_server_identifiers,
          remove_server_identifiers: validatedArgs.remove_server_identifiers,
          restore_association_ids: validatedArgs.restore_association_ids,
        });

        let content = `**Tenant servers updated** (tenant=${result.tenant.slug}, id=${result.tenant.id})\n\n`;
        content += `- Added: ${result.added.length}\n`;
        content += `- Removed: ${result.removed.length}\n`;
        content += `- Restored: ${result.restored.length}\n`;
        content += `- Skipped: ${result.skipped.length}\n`;
        content += `- Unresolved identifiers: ${result.unresolved_identifiers.length}\n`;

        if (result.added.length > 0) {
          content += `\n**Added:**\n`;
          for (const item of result.added) {
            content += `- ${item.mcp_server_slug} (server_id=${item.mcp_server_id}, association_id=${item.association_id}, outcome=${item.outcome})\n`;
          }
        }
        if (result.removed.length > 0) {
          content += `\n**Removed:**\n`;
          for (const item of result.removed) {
            const assocPart =
              item.association_id != null ? `, association_id=${item.association_id}` : '';
            content += `- ${item.mcp_server_slug} (server_id=${item.mcp_server_id}${assocPart}, outcome=${item.outcome})\n`;
          }
        }
        if (result.restored.length > 0) {
          content += `\n**Restored:**\n`;
          for (const item of result.restored) {
            content += `- ${item.mcp_server_slug} (server_id=${item.mcp_server_id}, association_id=${item.association_id})\n`;
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
              text: `Error updating tenant servers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
