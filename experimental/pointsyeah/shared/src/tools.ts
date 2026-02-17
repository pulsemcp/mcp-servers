import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { searchFlightsTool } from './tools/search-flights.js';
import { getSearchHistoryTool } from './tools/get-search-history.js';
import { setRefreshTokenTool } from './tools/set-refresh-token.js';
import { getServerState, setAuthenticated, clearRefreshToken } from './state.js';
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

const AUTH_REQUIRED_ERROR =
  'Authentication required. Please call the set_refresh_token tool first with a valid PointsYeah refresh token.';

/**
 * Creates a static tool registration system that exposes all tools at startup.
 *
 * Auth-requiring tools (search_flights, get_search_history) check authentication
 * state at call time and return an error directing users to set_refresh_token
 * if not authenticated. This approach is compatible with MCP clients that don't
 * support dynamic tool list updates via tools/list_changed notifications.
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);

  return (server: Server) => {
    // Build the authenticated tool list
    const authedTools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map(
      (def) => def.factory(server, clientFactory)
    );

    // Build the set_refresh_token tool
    const authTool = setRefreshTokenTool();

    // Wrap authed tool handlers to:
    // 1. Check auth state before executing
    // 2. Detect token revocation during execution
    const wrappedAuthedTools: Tool[] = authedTools.map((tool) => ({
      ...tool,
      handler: async (args: unknown) => {
        // Check if authenticated before executing
        if (!getServerState().authenticated) {
          return {
            content: [{ type: 'text', text: AUTH_REQUIRED_ERROR }],
            isError: true,
          };
        }

        const result = await tool.handler(args);

        // Detect token revocation and update state
        if (result.isError && isTokenRevoked(result.content)) {
          logWarning('auth', 'Token revoked during tool call');
          setAuthenticated(false);
          clearRefreshToken();
        }
        return result;
      },
    }));

    // All tools are always visible
    const allTools = [...wrappedAuthedTools, authTool];

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: allTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: callArgs } = request.params;
      const tool = allTools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      return await tool.handler(callArgs);
    });
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
