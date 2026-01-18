import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';

// Simplified tool surface - 6 tools
import { searchSessionsTool } from './tools/search-sessions.js';
import { startSessionTool } from './tools/start-session.js';
import { getSessionTool } from './tools/get-session.js';
import { actionSessionTool } from './tools/action-session.js';
import { getAvailableMcpServersTool } from './tools/get-available-mcp-servers.js';
import { getConfigsTool } from './tools/get-configs.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
// This is useful for permission-based access control or feature flags.
//
// Usage: Set ENABLED_TOOLGROUPS environment variable to a comma-separated list
// Example: ENABLED_TOOLGROUPS="readonly,write" (excludes 'admin' tools)
// Default: All groups enabled when not specified
// =============================================================================

/**
 * Available tool groups for agent-orchestrator:
 * - 'readonly': Read-only operations (search_sessions, get_session)
 * - 'write': Write operations (start_session, action_session)
 * - 'admin': Administrative operations (reserved for future use)
 */
export type ToolGroup = 'readonly' | 'write' | 'admin';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'write', 'admin'];

/**
 * Parse enabled tool groups from environment variable.
 * @param enabledGroupsParam - Comma-separated list of groups (e.g., "readonly,write")
 * @returns Array of enabled tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  if (!enabledGroupsParam) {
    return ALL_TOOL_GROUPS; // All groups enabled by default
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

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Generic tool interface that all tools must conform to.
 */
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

/**
 * All available tools with their group assignments.
 * Tools can belong to multiple groups.
 *
 * Simplified tool surface:
 * - search_sessions: Search/list/get sessions by ID
 * - start_session: Create a new session
 * - get_session: Get detailed session info with optional logs/transcripts
 * - action_session: Perform actions (follow_up, pause, restart, archive, unarchive)
 * - get_available_mcp_servers: List available MCP servers for use with start_session
 * - get_configs: Fetch all static configuration (MCP servers, agent roots, stop conditions)
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read operations
  { factory: searchSessionsTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getSessionTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getAvailableMcpServersTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getConfigsTool, groups: ['readonly', 'write', 'admin'] },

  // Write operations
  { factory: startSessionTool, groups: ['write', 'admin'] },
  { factory: actionSessionTool, groups: ['write', 'admin'] },
];

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * @param clientFactory - Factory function that creates client instances
 * @param enabledGroups - Optional array of enabled tool groups (defaults to all)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);

  return (server: Server) => {
    // Filter tools by enabled groups and create instances
    const tools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map((def) =>
      def.factory(server, clientFactory)
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
    });
  };
}

// Keep the original registerTools for backward compatibility
export function registerTools(server: Server) {
  // This maintains compatibility but doesn't use dependency injection
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
