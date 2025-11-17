import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  query: 'Search query to find MCP implementations by name, description, provider, or slug',
  type: 'Filter by implementation type: "server", "client", or "all" (default: "all")',
  status:
    'Filter by implementation status: "draft", "live", "archived", or "all" (default: "live")',
  limit: 'Maximum number of results to return (1-100, default: 30)',
  offset: 'Number of results to skip for pagination (default: 0)',
} as const;

const SearchMCPImplementationsSchema = z.object({
  query: z.string().min(1).describe(PARAM_DESCRIPTIONS.query),
  type: z.enum(['server', 'client', 'all']).optional().describe(PARAM_DESCRIPTIONS.type),
  status: z
    .enum(['draft', 'live', 'archived', 'all'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function searchMCPImplementations(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'search_mcp_implementations',
    description: `Search for MCP implementations (servers and clients) in the PulseMCP registry.

This tool searches across:
- Implementation names
- Short descriptions
- Full descriptions
- Provider/organization names
- Slugs and identifiers

Returns a list of matching implementations with their metadata, including:
- Name, description, and slug
- Type (server or client)
- Status (draft, live, archived)
- Classification (official, community, reference)
- Implementation language
- GitHub stars and popularity metrics
- Associated MCP server/client IDs
- PulseMCP web URL

Use cases:
- Find existing MCP servers before creating a new one
- Discover servers by functionality (e.g., "database", "file system", "git")
- Look up servers by provider/organization
- Browse available MCP clients
- Check implementation status and metadata
- Find servers implemented in a specific language
- Discover popular or official implementations

Note: This tool queries the PulseMCP registry API. Results depend on what has been published to the registry.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
        type: {
          type: 'string',
          enum: ['server', 'client', 'all'],
          description: PARAM_DESCRIPTIONS.type,
        },
        status: {
          type: 'string',
          enum: ['draft', 'live', 'archived', 'all'],
          description: PARAM_DESCRIPTIONS.status,
        },
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
        },
        offset: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.offset,
        },
      },
      required: ['query'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SearchMCPImplementationsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.searchMCPImplementations({
          query: validatedArgs.query,
          type: validatedArgs.type || 'all',
          status: validatedArgs.status || 'live',
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        // Format the response for MCP
        let content = `Found ${response.implementations.length} MCP implementation(s) matching "${validatedArgs.query}"`;

        if (response.pagination) {
          content += ` (showing ${response.implementations.length} of ${response.pagination.total_count} total)`;
        }

        content += ':\n\n';

        for (const [index, impl] of response.implementations.entries()) {
          content += `${index + 1}. **${impl.name}** (${impl.type})\n`;
          content += `   Slug: ${impl.slug}\n`;
          content += `   Status: ${impl.status}`;

          if (impl.classification) {
            content += ` | Classification: ${impl.classification}`;
          }

          content += '\n';

          if (impl.provider_name) {
            content += `   Provider: ${impl.provider_name}\n`;
          }

          if (impl.implementation_language) {
            content += `   Language: ${impl.implementation_language}\n`;
          }

          if (impl.github_stars !== undefined && impl.github_stars !== null) {
            content += `   GitHub Stars: ${impl.github_stars}\n`;
          }

          if (impl.short_description) {
            content += `   ${impl.short_description}\n`;
          }

          if (impl.url) {
            content += `   URL: ${impl.url}\n`;
          }

          // Show associated IDs for reference
          if (impl.mcp_server_id) {
            content += `   MCP Server ID: ${impl.mcp_server_id}\n`;
          }

          if (impl.mcp_client_id) {
            content += `   MCP Client ID: ${impl.mcp_client_id}\n`;
          }

          content += '\n';
        }

        if (response.pagination?.has_next) {
          const nextOffset = (validatedArgs.offset || 0) + (validatedArgs.limit || 30);
          content += `\n---\nMore results available. Use offset=${nextOffset} to see the next page.`;
        }

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching MCP implementations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
