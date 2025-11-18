import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  page: 'Page number for pagination, starting from 1. Default: 1',
  search: 'Search query to filter draft implementations by name or description',
} as const;

const GetDraftMCPImplementationsSchema = z.object({
  page: z.number().optional().describe(PARAM_DESCRIPTIONS.page),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
});

export function getDraftMCPImplementations(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_draft_mcp_implementations',
    description: `Retrieve a paginated list of draft MCP implementations from the PulseMCP Admin panel with all associated objects. Returns formatted markdown with implementation details, metadata, and linked resources.

This tool returns the same data shown in the Admin panel sidebar under "MCPs" - all MCP implementations currently in draft status that need review, editing, or publishing.

The response is formatted as markdown with:
- Total count and pagination info
- Numbered list of draft implementations, each showing:
  - Name and slug
  - Type (server or client)
  - Short description (if available)
  - Classification (official, community, reference)
  - Implementation language
  - Provider name
  - **Associated MCP Server details** (if linked): name, slug, description, classification, download stats
  - **Associated MCP Client details** (if linked): name, slug, description, featured status, logo URL
  - Created and updated dates

Associated objects are automatically fetched and included for each implementation that has linked MCP servers or clients, providing complete context for review and editing.

Use cases:
- Review all draft implementations with complete context including linked servers/clients
- Find specific draft implementations to edit before publishing
- Monitor the queue of pending implementations with their associations
- Check implementation and linked resource details before making updates
- Track which implementations are ready for publication
- Search for specific draft implementations by name or description
- View complete server/client information without separate API calls`,
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.page,
        },
        search: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.search,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetDraftMCPImplementationsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getDraftMCPImplementations(validatedArgs);

        // Fetch associated MCP servers and clients for each implementation
        for (const impl of response.implementations) {
          if (impl.mcp_server_id) {
            try {
              impl.mcp_server = await client.getMCPServerById(impl.mcp_server_id);
            } catch (error) {
              console.error(`Failed to fetch MCP server ${impl.mcp_server_id}:`, error);
              impl.mcp_server = null;
            }
          }

          if (impl.mcp_client_id) {
            try {
              impl.mcp_client = await client.getMCPClientById(impl.mcp_client_id);
            } catch (error) {
              console.error(`Failed to fetch MCP client ${impl.mcp_client_id}:`, error);
              impl.mcp_client = null;
            }
          }
        }

        // Format the response for MCP
        let content = `Found ${response.implementations.length} draft MCP implementations`;

        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }

        content += ':\n\n';

        for (const [index, impl] of response.implementations.entries()) {
          content += `${index + 1}. **${impl.name}** (${impl.slug})\n`;
          content += `   ID: ${impl.id} | Type: ${impl.type} | Status: ${impl.status}\n`;

          if (impl.short_description) {
            content += `   Description: ${impl.short_description}\n`;
          }

          if (impl.classification) {
            content += `   Classification: ${impl.classification}\n`;
          }

          if (impl.implementation_language) {
            content += `   Language: ${impl.implementation_language}\n`;
          }

          if (impl.provider_name) {
            content += `   Provider: ${impl.provider_name}\n`;
          }

          if (impl.url) {
            content += `   URL: ${impl.url}\n`;
          }

          if (impl.github_stars !== undefined) {
            content += `   GitHub Stars: ${impl.github_stars}\n`;
          }

          if (impl.mcp_server) {
            content += `   Linked MCP Server: ${impl.mcp_server.name || impl.mcp_server.slug} (${impl.mcp_server.slug}, ID: ${impl.mcp_server.id})\n`;
            if (impl.mcp_server.description) {
              content += `     Server Description: ${impl.mcp_server.description}\n`;
            }
            if (impl.mcp_server.classification) {
              content += `     Server Classification: ${impl.mcp_server.classification}\n`;
            }
            if (impl.mcp_server.downloads_estimate_total) {
              content += `     Total Downloads: ${impl.mcp_server.downloads_estimate_total.toLocaleString()}\n`;
            }
          } else if (impl.mcp_server_id) {
            content += `   Linked MCP Server ID: ${impl.mcp_server_id} (details not available)\n`;
          }

          if (impl.mcp_client) {
            content += `   Linked MCP Client: ${impl.mcp_client.name || impl.mcp_client.slug} (${impl.mcp_client.slug}, ID: ${impl.mcp_client.id})\n`;
            if (impl.mcp_client.description) {
              content += `     Client Description: ${impl.mcp_client.description}\n`;
            }
            if (impl.mcp_client.featured) {
              content += `     Featured Client: Yes\n`;
            }
            if (impl.mcp_client.logo_url) {
              content += `     Logo: ${impl.mcp_client.logo_url}\n`;
            }
          } else if (impl.mcp_client_id) {
            content += `   Linked MCP Client ID: ${impl.mcp_client_id} (details not available)\n`;
          }

          if (impl.created_at) {
            content += `   Created: ${new Date(impl.created_at).toLocaleDateString()}\n`;
          }

          if (impl.updated_at) {
            content += `   Updated: ${new Date(impl.updated_at).toLocaleDateString()}\n`;
          }

          content += '\n';
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
              text: `Error fetching draft MCP implementations: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
