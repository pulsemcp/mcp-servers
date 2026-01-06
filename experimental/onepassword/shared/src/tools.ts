import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { listVaultsTool } from './tools/list-vaults-tool.js';
import { listItemsTool } from './tools/list-items-tool.js';
import { getItemTool } from './tools/get-item-tool.js';
import { listItemsByTagTool } from './tools/list-items-by-tag-tool.js';
import { createLoginTool } from './tools/create-login-tool.js';
import { createSecureNoteTool } from './tools/create-secure-note-tool.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
// This is useful for permission-based access control.
//
// Usage: Set ENABLED_TOOLGROUPS environment variable to a comma-separated list
// Example: ENABLED_TOOLGROUPS="readonly" (excludes 'write' tools)
// Default: All groups enabled when not specified
// =============================================================================

/**
 * Available tool groups:
 * - 'readonly': Tools that only read data (list vaults, list items, get item, list by tag)
 * - 'write': Tools that create or modify data (create login, create secure note)
 */
export type ToolGroup = 'readonly' | 'write';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'write'];

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
 *
 * Group behavior:
 * - 'readonly': Grants access to read-only tools only
 * - 'write': Grants access to ALL tools (read + write) since write operations
 *            typically require reading items first (e.g., to find vault IDs)
 *
 * Examples:
 * - ENABLED_TOOLGROUPS="readonly" -> Only list/get operations
 * - ENABLED_TOOLGROUPS="write" -> All operations (read + write)
 * - ENABLED_TOOLGROUPS="readonly,write" -> All operations
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only tools - available in both groups since write operations need to read first
  { factory: listVaultsTool, groups: ['readonly', 'write'] },
  { factory: listItemsTool, groups: ['readonly', 'write'] },
  { factory: getItemTool, groups: ['readonly', 'write'] },
  { factory: listItemsByTagTool, groups: ['readonly', 'write'] },
  // Write-only tools - only available when 'write' group is enabled
  { factory: createLoginTool, groups: ['write'] },
  { factory: createSecureNoteTool, groups: ['write'] },
];

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
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
