import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  unofficial_mirror_id: 'Filter by unofficial mirror ID',
  q: 'Search query to filter by title',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetMcpJsonsSchema = z.object({
  unofficial_mirror_id: z.number().optional().describe(PARAM_DESCRIPTIONS.unofficial_mirror_id),
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getMcpJsons(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_mcp_jsons',
    description: `Retrieve a paginated list of MCP JSON configurations. MCP JSONs contain server configuration templates that can be used to set up MCP servers.

Example response:
{
  "mcp_jsons": [
    {
      "id": 123,
      "mcp_servers_unofficial_mirror_id": 456,
      "unofficial_mirror_name": "@modelcontextprotocol/server-filesystem",
      "title": "Default Configuration",
      "value": { "command": "npx", "args": [...] }
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 100 }
}

Use cases:
- Browse MCP JSON configurations
- Find configurations for a specific unofficial mirror
- Search for configurations by title
- Review configuration templates before using them`,
    inputSchema: {
      type: 'object',
      properties: {
        unofficial_mirror_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.unofficial_mirror_id,
        },
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMcpJsonsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getMcpJsons(validatedArgs);

        let content = `Found ${response.mcp_jsons.length} MCP JSONs`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, mcpJson] of response.mcp_jsons.entries()) {
          content += `${index + 1}. **${mcpJson.title}** (ID: ${mcpJson.id})\n`;
          if (mcpJson.unofficial_mirror_name) {
            content += `   Mirror: ${mcpJson.unofficial_mirror_name}`;
            if (mcpJson.unofficial_mirror_version) {
              content += ` v${mcpJson.unofficial_mirror_version}`;
            }
            content += '\n';
          }
          if (mcpJson.description) {
            content += `   Description: ${mcpJson.description}\n`;
          }
          if (mcpJson.server_key) {
            content += `   Server Key: ${mcpJson.server_key}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MCP JSONs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
