import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { ConfigsResponse, AgentRootInfo, StopConditionInfo, MCPServerInfo } from '../types.js';
import { getConfigsCache, setConfigsCache } from './get-available-mcp-servers.js';

export const GetConfigsSchema = z.object({
  force_refresh: z
    .boolean()
    .optional()
    .describe('Force refresh the cache and fetch fresh data from the API. Default: false'),
});

const TOOL_DESCRIPTION = `Fetches all static configuration data in a single call.

Returns:
- **MCP servers**: Available servers for use with start_session (name, title, description)
- **Agent roots**: Preconfigured repository settings with defaults (git_root, branch, mcp_servers, stop_condition)
- **Stop conditions**: Available session completion criteria (id, name, description)

**Use this tool** to get all configuration options before calling start_session.

**Caching:** Results are cached in memory for the session. Use force_refresh=true to fetch fresh data.`;

export function getConfigsTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'get_configs',
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
        const validatedArgs = GetConfigsSchema.parse(args);
        const forceRefresh = validatedArgs.force_refresh ?? false;

        // Use cached data if available and not forcing refresh
        const cachedConfigs = getConfigsCache();
        if (cachedConfigs !== null && !forceRefresh) {
          return formatResponse(cachedConfigs, true);
        }

        // Fetch fresh data using unified configs endpoint
        const client = clientFactory();
        const configs = await client.getConfigs();

        // Update shared cache
        setConfigsCache(configs);

        return formatResponse(configs, false);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching configs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

function formatResponse(configs: ConfigsResponse, fromCache: boolean) {
  const lines: string[] = [];

  // MCP Servers section
  lines.push('## MCP Servers');
  lines.push('');
  if (configs.mcp_servers.length === 0) {
    lines.push('*No MCP servers available.*');
  } else {
    lines.push(
      `Found ${configs.mcp_servers.length} server${configs.mcp_servers.length === 1 ? '' : 's'}:`
    );
    lines.push('');
    for (const server of configs.mcp_servers) {
      formatMcpServer(lines, server);
    }
  }

  // Agent Roots section
  lines.push('---');
  lines.push('');
  lines.push('## Agent Roots');
  lines.push('');
  if (configs.agent_roots.length === 0) {
    lines.push('*No agent roots configured.*');
  } else {
    lines.push(
      `Found ${configs.agent_roots.length} preconfigured repositor${configs.agent_roots.length === 1 ? 'y' : 'ies'}:`
    );
    lines.push('');
    for (const root of configs.agent_roots) {
      formatAgentRoot(lines, root);
    }
  }

  // Stop Conditions section
  lines.push('---');
  lines.push('');
  lines.push('## Stop Conditions');
  lines.push('');
  if (configs.stop_conditions.length === 0) {
    lines.push('*No stop conditions defined.*');
  } else {
    lines.push(
      `Found ${configs.stop_conditions.length} stop condition${configs.stop_conditions.length === 1 ? '' : 's'}:`
    );
    lines.push('');
    for (const condition of configs.stop_conditions) {
      formatStopCondition(lines, condition);
    }
  }

  // Usage hints
  lines.push('---');
  lines.push('');
  lines.push('### Usage Notes');
  lines.push('');
  lines.push('- Use `name` values from **MCP Servers** in `start_session` `mcp_servers` parameter');
  lines.push('- Use `git_root` from **Agent Roots** to start sessions with preconfigured defaults');
  lines.push(
    '- Use `id` values from **Stop Conditions** in `start_session` `stop_condition` parameter'
  );

  if (fromCache) {
    lines.push('');
    lines.push('*(Returned from cache. Use `force_refresh: true` to fetch fresh data.)*');
  }

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}

function formatMcpServer(lines: string[], server: MCPServerInfo) {
  lines.push(`### ${server.title}`);
  lines.push(`- **Name:** \`${server.name}\``);
  lines.push(`- **Description:** ${server.description}`);
  lines.push('');
}

function formatAgentRoot(lines: string[], root: AgentRootInfo) {
  lines.push(`### ${root.title}`);
  lines.push(`- **Name:** \`${root.name}\``);
  lines.push(`- **Git Root:** \`${root.git_root}\``);
  lines.push(`- **Description:** ${root.description}`);
  if (root.default_branch) {
    lines.push(`- **Default Branch:** \`${root.default_branch}\``);
  }
  if (root.default_subdirectory) {
    lines.push(`- **Default Subdirectory:** \`${root.default_subdirectory}\``);
  }
  if (root.default_mcp_servers && root.default_mcp_servers.length > 0) {
    lines.push(
      `- **Default MCP Servers:** ${root.default_mcp_servers.map((s) => `\`${s}\``).join(', ')}`
    );
  }
  if (root.default_stop_condition) {
    lines.push(`- **Default Stop Condition:** \`${root.default_stop_condition}\``);
  }
  lines.push('');
}

function formatStopCondition(lines: string[], condition: StopConditionInfo) {
  lines.push(`### ${condition.name}`);
  lines.push(`- **ID:** \`${condition.id}\``);
  lines.push(`- **Description:** ${condition.description}`);
  lines.push('');
}
