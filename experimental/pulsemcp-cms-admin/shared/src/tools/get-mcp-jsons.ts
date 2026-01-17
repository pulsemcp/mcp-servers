import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  unofficial_mirror_id: 'Filter by unofficial mirror ID',
  unofficial_mirror_name:
    'Filter by unofficial mirror name (e.g., "@modelcontextprotocol/server-filesystem")',
  mcp_server_id:
    'Filter by linked MCP server ID - returns MCP JSONs for all unofficial mirrors linked to this server',
  mcp_server_slug:
    'Filter by linked MCP server slug - returns MCP JSONs for all unofficial mirrors linked to this server',
  q: 'Search query to filter by title',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetMcpJsonsSchema = z.object({
  unofficial_mirror_id: z.number().optional().describe(PARAM_DESCRIPTIONS.unofficial_mirror_id),
  unofficial_mirror_name: z.string().optional().describe(PARAM_DESCRIPTIONS.unofficial_mirror_name),
  mcp_server_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  mcp_server_slug: z.string().optional().describe(PARAM_DESCRIPTIONS.mcp_server_slug),
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
- Find configurations for a specific unofficial mirror (by ID or name)
- Find all configurations for an MCP server (by ID or slug)
- Search for configurations by title
- Review configuration templates before using them

Note: When filtering by mcp_server_slug/mcp_server_id, returns up to 100 mirrors and their MCP JSONs.`,
    inputSchema: {
      type: 'object',
      properties: {
        unofficial_mirror_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.unofficial_mirror_id,
        },
        unofficial_mirror_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.unofficial_mirror_name,
        },
        mcp_server_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.mcp_server_id,
        },
        mcp_server_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.mcp_server_slug,
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
        // Resolve convenience parameters to unofficial_mirror_id
        let unofficialMirrorId = validatedArgs.unofficial_mirror_id;

        // If unofficial_mirror_name is provided, search for the mirror by name
        if (validatedArgs.unofficial_mirror_name && !unofficialMirrorId) {
          const mirrorsResponse = await client.getUnofficialMirrors({
            q: validatedArgs.unofficial_mirror_name,
            limit: 1,
          });
          if (mirrorsResponse.mirrors.length === 0) {
            throw new Error(
              `No unofficial mirror found with name matching "${validatedArgs.unofficial_mirror_name}"`
            );
          }
          unofficialMirrorId = mirrorsResponse.mirrors[0].id;
        }

        // If mcp_server_slug or mcp_server_id is provided, get all MCP JSONs for unofficial mirrors linked to that server
        if (validatedArgs.mcp_server_slug || validatedArgs.mcp_server_id) {
          let mcpServerId = validatedArgs.mcp_server_id;
          if (validatedArgs.mcp_server_slug && !mcpServerId) {
            const mcpServer = await client.getMCPServerBySlug(validatedArgs.mcp_server_slug);
            mcpServerId = mcpServer.id;
          }

          // Get unofficial mirrors for this MCP server
          const mirrorsResponse = await client.getUnofficialMirrors({
            mcp_server_id: mcpServerId,
            limit: 100, // Get all mirrors for this server
          });

          if (mirrorsResponse.mirrors.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No unofficial mirrors found linked to MCP server ${validatedArgs.mcp_server_slug || mcpServerId}`,
                },
              ],
            };
          }

          // Collect MCP JSONs from all mirrors
          const allMcpJsons: Awaited<ReturnType<typeof client.getMcpJsons>>['mcp_jsons'] = [];
          for (const mirror of mirrorsResponse.mirrors) {
            const jsonsResponse = await client.getMcpJsons({
              unofficial_mirror_id: mirror.id,
              q: validatedArgs.q,
            });
            allMcpJsons.push(...jsonsResponse.mcp_jsons);
          }

          // Format output for multi-mirror response
          let content = `Found ${allMcpJsons.length} MCP JSONs across ${mirrorsResponse.mirrors.length} unofficial mirrors for MCP server ${validatedArgs.mcp_server_slug || mcpServerId}:\n\n`;

          for (const [index, mcpJson] of allMcpJsons.entries()) {
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
        }

        const response = await client.getMcpJsons({
          unofficial_mirror_id: unofficialMirrorId,
          q: validatedArgs.q,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

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
