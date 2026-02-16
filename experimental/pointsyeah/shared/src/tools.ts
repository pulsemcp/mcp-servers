import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { searchFlightsTool } from './tools/search-flights.js';
import { getSearchHistoryTool } from './tools/get-search-history.js';
import { setRefreshTokenTool } from './tools/set-refresh-token.js';
import { getServerState, setAuthenticated } from './state.js';
import { logWarning } from './logging.js';

export type ToolGroup = 'readonly' | 'write' | 'admin';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'write', 'admin'];

export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  if (!enabledGroupsParam) {
    return ALL_TOOL_GROUPS;
  }

  const requestedGroups = enabledGroupsParam.split(',').map((g) => g.trim().toLowerCase());
  const validGroups = requestedGroups.filter((g): g is ToolGroup =>
    ALL_TOOL_GROUPS.includes(g as ToolGroup)
  );

  if (validGroups.length === 0) {
    console.error(
      `Warning: No valid tool groups found in "${enabledGroupsParam}". Valid groups: ${ALL_TOOL_GROUPS.join(', ')}`
    );
    return ALL_TOOL_GROUPS;
  }

  return validGroups;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

type ToolFactory = (server: Server, clientFactory: ClientFactory) => Tool;

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

const ALL_TOOLS: ToolDefinition[] = [
  // Flight search queries external APIs, classified as write operation
  { factory: searchFlightsTool, groups: ['write', 'admin'] },
  // Read-only tools - only query existing data
  { factory: getSearchHistoryTool, groups: ['readonly', 'write', 'admin'] },
];

/**
 * Creates a dynamic tool registration system that swaps between:
 * - "auth needed" mode: only set_refresh_token is visible
 * - "authenticated" mode: normal tools are visible, set_refresh_token is hidden
 *
 * When an auth failure is detected during tool use, the system automatically
 * switches back to "auth needed" mode.
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);

  return (server: Server) => {
    // Build the normal (authenticated) tool list
    const authedTools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map(
      (def) => def.factory(server, clientFactory)
    );

    // Build the set_refresh_token tool with a callback that switches to authed mode
    const authTool = setRefreshTokenTool(async () => {
      applyToolList(authedTools);
      await server.sendToolListChanged();
    });

    // Wrap authed tool handlers to detect auth failures and switch back
    const wrappedAuthedTools: Tool[] = authedTools.map((tool) => ({
      ...tool,
      handler: async (args: unknown) => {
        const result = await tool.handler(args);
        if (result.isError && isTokenRevoked(result.content)) {
          logWarning('auth', 'Token revoked during tool call, switching to set_refresh_token mode');
          setAuthenticated(false);
          applyToolList([authTool]);
          await server.sendToolListChanged();
        }
        return result;
      },
    }));

    function applyToolList(tools: Tool[]) {
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      }));

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: callArgs } = request.params;
        const tool = tools.find((t) => t.name === name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }
        return await tool.handler(callArgs);
      });
    }

    // Set initial tool list based on auth state
    const { authenticated } = getServerState();
    if (authenticated) {
      applyToolList(wrappedAuthedTools);
    } else {
      applyToolList([authTool]);
    }
  };
}

/**
 * Check if a tool result indicates a revoked/expired token.
 */
function isTokenRevoked(content: Array<{ type: string; text: string }>): boolean {
  const text = content.map((c) => c.text).join(' ');
  return (
    text.includes('Refresh token expired or revoked') ||
    text.includes('NotAuthorizedException') ||
    text.includes('update POINTSYEAH_REFRESH_TOKEN')
  );
}
