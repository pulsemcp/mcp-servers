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
    description: `Retrieve a paginated list of draft MCP implementations from the PulseMCP Admin panel. Returns formatted markdown with implementation details and metadata.

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
  - Associated MCP server/client ID (if linked)
  - Created and updated dates

Use cases:
- Review all draft implementations that need attention
- Find specific draft implementations to edit before publishing
- Monitor the queue of pending implementations
- Check implementation details before making updates
- Track which implementations are ready for publication
- Search for specific draft implementations by name or description`,
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

          if (impl.mcp_server_id) {
            content += `   Linked MCP Server ID: ${impl.mcp_server_id}\n`;
          }

          if (impl.mcp_client_id) {
            content += `   Linked MCP Client ID: ${impl.mcp_client_id}\n`;
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
