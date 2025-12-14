import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StorageClientFactory } from './server.js';
import { saveFileTool } from './tools/save-file.js';
import { getFileTool } from './tools/get-file.js';
import { searchFilesTool } from './tools/search-files.js';
import { deleteFileTool } from './tools/delete-file.js';

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
 * Available tool groups.
 * - 'readonly': Read-only operations (get, search)
 * - 'write': Write operations (save)
 * - 'admin': Administrative operations (delete)
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

type ToolFactory = (server: Server, clientFactory: StorageClientFactory) => Tool;

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

/**
 * All available tools with their group assignments.
 */
const ALL_TOOLS: ToolDefinition[] = [
  // save_file - write operation
  { factory: saveFileTool, groups: ['write', 'admin'] },
  // get_file - read-only operation
  { factory: getFileTool, groups: ['readonly', 'write', 'admin'] },
  // search_files - read-only operation
  { factory: searchFilesTool, groups: ['readonly', 'write', 'admin'] },
  // delete_file - admin operation (destructive)
  { factory: deleteFileTool, groups: ['admin'] },
];

/**
 * Creates a function to register all tools with the server.
 *
 * @param clientFactory - Factory function that creates storage client instances
 * @param enabledGroups - Optional array of enabled tool groups (defaults to all)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(
  clientFactory: StorageClientFactory,
  enabledGroups?: ToolGroup[]
) {
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
