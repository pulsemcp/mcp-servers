import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter by name',
  mcp_server_id: 'Filter by linked MCP server ID',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetUnofficialMirrorsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  mcp_server_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getUnofficialMirrors(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_unofficial_mirrors',
    description: `Retrieve a paginated list of unofficial mirrors from the PulseMCP Admin API. Unofficial mirrors are community-submitted MCP server definitions that contain metadata like name, version, and configuration data.

Example response:
{
  "mirrors": [
    {
      "id": 123,
      "name": "@modelcontextprotocol/server-filesystem",
      "version": "1.0.0",
      "mcp_server_id": 456,
      "mcp_server_slug": "filesystem",
      "proctor_results_count": 5,
      "mcp_jsons_count": 2
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 150 }
}

Use cases:
- Browse unofficial mirrors to find community-submitted server definitions
- Search for specific mirrors by name
- Filter mirrors by linked MCP server ID
- Review mirrors before linking them to official MCP servers`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        mcp_server_id: { type: 'number', description: PARAM_DESCRIPTIONS.mcp_server_id },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetUnofficialMirrorsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getUnofficialMirrors(validatedArgs);

        let content = `Found ${response.mirrors.length} unofficial mirrors`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, mirror] of response.mirrors.entries()) {
          content += `${index + 1}. **${mirror.name}** (ID: ${mirror.id})\n`;
          content += `   Version: ${mirror.version}\n`;
          if (mirror.mcp_server_slug) {
            content += `   Linked Server: ${mirror.mcp_server_slug} (ID: ${mirror.mcp_server_id})\n`;
          }
          if (mirror.proctor_results_count !== undefined) {
            content += `   Proctor Results: ${mirror.proctor_results_count}\n`;
          }
          if (mirror.mcp_jsons_count !== undefined) {
            content += `   MCP JSONs: ${mirror.mcp_jsons_count}\n`;
          }
          if (mirror.datetime_ingested) {
            content += `   Ingested: ${new Date(mirror.datetime_ingested).toLocaleDateString()}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching unofficial mirrors: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
