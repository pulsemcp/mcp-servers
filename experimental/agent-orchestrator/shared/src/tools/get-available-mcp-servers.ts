import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { MCPServerInfo } from '../types.js';
import { getConfigsCache, setConfigsCache, clearConfigsCache } from '../cache/configs-cache.js';

export const GetAvailableMcpServersSchema = z.object({
  force_refresh: z
    .boolean()
    .optional()
    .describe('Force refresh the cache and fetch fresh data from the API. Default: false'),
});

const TOOL_DESCRIPTION = `Lists all available MCP servers that can be used with start_session.

Returns server names, titles, and descriptions for each available MCP server.

**Use this tool** before calling start_session to see available options for the mcp_servers parameter.

**Caching:** Results are cached in memory for the session. Use force_refresh=true to fetch fresh data.

**Note:** Consider using \`get_configs\` instead to fetch all static configuration (MCP servers, agent roots, stop conditions) in a single call.`;

// Re-export cache functions for backwards compatibility
export { clearConfigsCache, getConfigsCache, setConfigsCache };

// Legacy exports for backwards compatibility with tests
export function clearMcpServersCache(): void {
  clearConfigsCache();
}

export function getMcpServersCache(): MCPServerInfo[] | null {
  return getConfigsCache()?.mcp_servers ?? null;
}

export function getAvailableMcpServersTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'get_available_mcp_servers',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        force_refresh: {
          type: 'boolean',
          description: 'Force refresh the cache and fetch fresh data from the API. Default: false',
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetAvailableMcpServersSchema.parse(args);
        const forceRefresh = validatedArgs.force_refresh ?? false;

        // Use cached data if available and not forcing refresh
        const cachedConfigs = getConfigsCache();
        if (cachedConfigs !== null && !forceRefresh) {
          return formatResponse(cachedConfigs.mcp_servers, true);
        }

        // Fetch fresh data using unified configs endpoint
        const client = clientFactory();
        const configs = await client.getConfigs();

        // Update shared cache
        setConfigsCache(configs);

        return formatResponse(configs.mcp_servers, false);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching available MCP servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

function formatResponse(mcpServers: MCPServerInfo[], fromCache: boolean) {
  const lines: string[] = [];

  lines.push('## Available MCP Servers');
  lines.push('');

  if (mcpServers.length === 0) {
    lines.push('*No MCP servers available.*');
  } else {
    lines.push(`Found ${mcpServers.length} available server${mcpServers.length === 1 ? '' : 's'}:`);
    lines.push('');

    for (const server of mcpServers) {
      lines.push(`### ${server.title}`);
      lines.push(`- **Name:** \`${server.name}\``);
      lines.push(`- **Description:** ${server.description}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(
      '*Use the `name` values above in the `mcp_servers` parameter when calling `start_session`.*'
    );
  }

  if (fromCache) {
    lines.push('');
    lines.push('*(Returned from cache. Use `force_refresh: true` to fetch fresh data.)*');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
