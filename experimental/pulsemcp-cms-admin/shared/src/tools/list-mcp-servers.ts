import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter servers by name or description',
  status: 'Filter by status: draft, live, archived, or all (default: all)',
  classification: 'Filter by classification: official, community, or reference',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const ListMCPServersSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  status: z
    .enum(['draft', 'live', 'archived', 'all'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  classification: z
    .enum(['official', 'community', 'reference'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.classification),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function listMCPServers(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_mcp_servers',
    description: `List MCP servers from the PulseMCP registry. Returns a unified view of servers that abstracts away the underlying data model complexity.

Each server includes:
- **Basic info**: name, description, status, classification
- **Provider**: organization/person who created it
- **Source code**: GitHub repository location
- **Canonical URLs**: authoritative URLs for the server
- **Remote endpoints**: deployment endpoints (Smithery, Superinterface, etc.)
- **Download stats**: npm download estimates

Example response:
{
  "servers": [
    {
      "id": 123,
      "slug": "filesystem",
      "implementation_id": 456,
      "name": "Filesystem MCP Server",
      "short_description": "Access local filesystem",
      "status": "live",
      "classification": "official",
      "provider": { "name": "Anthropic", "slug": "anthropic" },
      "source_code": { "github_owner": "modelcontextprotocol", "github_repo": "servers" },
      "remotes": [{ "url_direct": "https://...", "host_platform": "smithery" }]
    }
  ]
}

Use cases:
- Browse all MCP servers in the registry
- Search for servers by name or description
- Filter servers by status or classification
- Review server details before making updates`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        status: {
          type: 'string',
          enum: ['draft', 'live', 'archived', 'all'],
          description: PARAM_DESCRIPTIONS.status,
        },
        classification: {
          type: 'string',
          enum: ['official', 'community', 'reference'],
          description: PARAM_DESCRIPTIONS.classification,
        },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListMCPServersSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getUnifiedMCPServers({
          q: validatedArgs.q,
          status: validatedArgs.status,
          classification: validatedArgs.classification,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        let content = `Found ${response.servers.length} MCP servers`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, server] of response.servers.entries()) {
          content += `${index + 1}. **${server.name}** (slug: \`${server.slug}\`)\n`;
          content += `   Implementation ID: ${server.implementation_id}\n`;
          if (server.short_description) {
            content += `   ${server.short_description}\n`;
          }
          content += `   Status: ${server.status}`;
          if (server.classification) {
            content += ` | Classification: ${server.classification}`;
          }
          content += '\n';

          if (server.provider?.name) {
            content += `   Provider: ${server.provider.name}`;
            if (server.provider.slug) {
              content += ` (${server.provider.slug})`;
            }
            content += '\n';
          }

          if (server.source_code?.github_owner && server.source_code?.github_repo) {
            content += `   GitHub: ${server.source_code.github_owner}/${server.source_code.github_repo}`;
            if (server.source_code.github_subfolder) {
              content += `/${server.source_code.github_subfolder}`;
            }
            if (server.source_code.github_stars) {
              content += ` (⭐ ${server.source_code.github_stars})`;
            }
            content += '\n';
          }

          if (server.remotes && server.remotes.length > 0) {
            content += `   Remote endpoints: ${server.remotes.length}\n`;
          }

          if (server.downloads_estimate_total) {
            content += `   Downloads (total): ${server.downloads_estimate_total.toLocaleString()}\n`;
          }

          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MCP servers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
