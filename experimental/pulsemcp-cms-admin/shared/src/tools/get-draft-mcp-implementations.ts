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
        // API now returns inline mcp_server and mcp_client objects - no N+1 fetching needed
        const response = await client.getDraftMCPImplementations(validatedArgs);

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

          if (impl.internal_notes) {
            content += `   Internal Notes: ${impl.internal_notes}\n`;
          }

          if (impl.classification) {
            content += `   Classification: ${impl.classification}\n`;
          }

          if (impl.implementation_language) {
            content += `   Language: ${impl.implementation_language}\n`;
          }

          // Provider info
          if (impl.provider_name) {
            let providerLine = `   Provider: ${impl.provider_name}`;
            if (impl.provider_slug) {
              providerLine += ` (${impl.provider_slug})`;
            }
            if (impl.provider_url) {
              providerLine += ` - ${impl.provider_url}`;
            }
            content += providerLine + '\n';
          }

          if (impl.url) {
            content += `   URL: ${impl.url}\n`;
          }

          // GitHub info
          if (impl.github_owner && impl.github_repo) {
            let githubLine = `   GitHub: ${impl.github_owner}/${impl.github_repo}`;
            if (impl.github_subfolder) {
              githubLine += `/${impl.github_subfolder}`;
            }
            if (impl.github_stars != null) {
              githubLine += ` (⭐ ${impl.github_stars.toLocaleString()})`;
            }
            content += githubLine + '\n';
            if (impl.github_status) {
              content += `   GitHub Status: ${impl.github_status}\n`;
            }
            if (impl.github_last_updated) {
              content += `   GitHub Last Updated: ${impl.github_last_updated}\n`;
            }
          } else if (impl.github_stars != null) {
            content += `   GitHub Stars: ${impl.github_stars.toLocaleString()}\n`;
          }

          // Linked MCP Server (now inline from API)
          // Note: name/description come from impl, not mcp_server
          if (impl.mcp_server) {
            content += `   Linked MCP Server: ${impl.mcp_server.slug} (ID: ${impl.mcp_server.id})\n`;
            if (impl.mcp_server.classification) {
              content += `     Server Classification: ${impl.mcp_server.classification}\n`;
            }
            // Download metrics
            if (impl.mcp_server.downloads_estimate_total) {
              let downloadLine = `     Downloads: ${impl.mcp_server.downloads_estimate_total.toLocaleString()} total`;
              if (impl.mcp_server.downloads_estimate_most_recent_week) {
                downloadLine += `, ${impl.mcp_server.downloads_estimate_most_recent_week.toLocaleString()} this week`;
              }
              if (impl.mcp_server.downloads_estimate_last_four_weeks) {
                downloadLine += `, ${impl.mcp_server.downloads_estimate_last_four_weeks.toLocaleString()} last 4 weeks`;
              }
              content += downloadLine + '\n';
            }
            if (impl.mcp_server.visitors_estimate_total) {
              content += `     Visitors: ${impl.mcp_server.visitors_estimate_total.toLocaleString()} total\n`;
            }
            // Registry info
            if (impl.mcp_server.registry_package_id) {
              let registryLine = `     Registry Package ID: ${impl.mcp_server.registry_package_id}`;
              if (impl.mcp_server.registry_package_soft_verified) {
                registryLine += ' (verified)';
              }
              content += registryLine + '\n';
            }
            // Tags
            if (impl.mcp_server.tags && impl.mcp_server.tags.length > 0) {
              const tagNames = impl.mcp_server.tags.map((t) => t.name).join(', ');
              content += `     Tags: ${tagNames}\n`;
            }
            // Remotes
            if (impl.mcp_server.remotes && impl.mcp_server.remotes.length > 0) {
              content += `     Remotes (${impl.mcp_server.remotes.length}):\n`;
              for (const remote of impl.mcp_server.remotes) {
                let remoteLine = `       - ${remote.display_name || remote.url_direct || remote.url_setup || 'Unnamed'}`;
                const attrs = [];
                if (remote.transport) attrs.push(remote.transport);
                if (remote.host_platform) attrs.push(remote.host_platform);
                if (remote.authentication_method)
                  attrs.push(`auth: ${remote.authentication_method}`);
                if (remote.cost) attrs.push(remote.cost);
                if (attrs.length > 0) {
                  remoteLine += ` [${attrs.join(', ')}]`;
                }
                content += remoteLine + '\n';
              }
            } else if (impl.mcp_server.mcp_server_remotes_count) {
              content += `     Remotes Count: ${impl.mcp_server.mcp_server_remotes_count}\n`;
            }
          } else if (impl.mcp_server_id) {
            content += `   Linked MCP Server ID: ${impl.mcp_server_id} (details not available)\n`;
          }

          // Linked MCP Client (now inline from API)
          // Note: name/description come from impl, not mcp_client
          if (impl.mcp_client) {
            content += `   Linked MCP Client: ${impl.mcp_client.slug} (ID: ${impl.mcp_client.id})\n`;
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
