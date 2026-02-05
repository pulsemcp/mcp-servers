import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { S3ClientFactory } from './server.js';
import { listBucketsTool } from './tools/list-buckets.js';
import { listObjectsTool } from './tools/list-objects.js';
import { getObjectTool } from './tools/get-object.js';
import { putObjectTool } from './tools/put-object.js';
import { deleteObjectTool } from './tools/delete-object.js';
import { createBucketTool } from './tools/create-bucket.js';
import { deleteBucketTool } from './tools/delete-bucket.js';
import { copyObjectTool } from './tools/copy-object.js';
import { headBucketTool } from './tools/head-bucket.js';
import { logWarning } from './logging.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
// This is useful for permission-based access control or feature flags.
//
// Usage: Set S3_ENABLED_TOOLGROUPS environment variable to a comma-separated list
// Example: S3_ENABLED_TOOLGROUPS="readonly" (only read operations)
// Example: S3_ENABLED_TOOLGROUPS="readonly,readwrite" (all operations)
// Default: All groups enabled when not specified
//
// Individual tools can also be enabled/disabled using S3_ENABLED_TOOLS or S3_DISABLED_TOOLS:
// S3_ENABLED_TOOLS="s3_list_buckets,s3_get_object" - only enable these specific tools
// S3_DISABLED_TOOLS="s3_delete_bucket,s3_delete_object" - disable these specific tools
// =============================================================================

/**
 * Available tool groups for S3 operations.
 * - 'readonly': Read-only operations (list, get, head)
 * - 'readwrite': Write operations (put, copy, delete, create)
 */
export type ToolGroup = 'readonly' | 'readwrite';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite'];

/**
 * Parse enabled tool groups from environment variable.
 * @param enabledGroupsParam - Comma-separated list of groups (e.g., "readonly,readwrite")
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
    logWarning(
      'parseEnabledToolGroups',
      `No valid tool groups found in "${enabledGroupsParam}". Valid groups: ${ALL_TOOL_GROUPS.join(', ')}. Using all groups.`
    );
    return ALL_TOOL_GROUPS;
  }

  return validGroups;
}

/**
 * Parse enabled/disabled tools from environment variables.
 */
export function parseToolFilters(
  enabledToolsParam?: string,
  disabledToolsParam?: string
): {
  enabledTools: Set<string> | null;
  disabledTools: Set<string>;
} {
  const enabledTools = enabledToolsParam
    ? new Set(enabledToolsParam.split(',').map((t) => t.trim()))
    : null;

  const disabledTools = new Set(
    disabledToolsParam ? disabledToolsParam.split(',').map((t) => t.trim()) : []
  );

  return { enabledTools, disabledTools };
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

type ToolFactory = (server: Server, clientFactory: S3ClientFactory) => Tool;

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

/**
 * All available S3 tools with their group assignments.
 *
 * Read-only tools (readonly group):
 * - s3_list_buckets: List all buckets
 * - s3_list_objects: List objects in a bucket
 * - s3_get_object: Get object contents
 * - s3_head_bucket: Check if bucket exists
 *
 * Write tools (readwrite group):
 * - s3_put_object: Upload/update objects
 * - s3_delete_object: Delete objects
 * - s3_copy_object: Copy objects
 * - s3_create_bucket: Create buckets
 * - s3_delete_bucket: Delete buckets
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only operations
  { factory: listBucketsTool, groups: ['readonly'] },
  { factory: listObjectsTool, groups: ['readonly'] },
  { factory: getObjectTool, groups: ['readonly'] },
  { factory: headBucketTool, groups: ['readonly'] },
  // Write operations
  { factory: putObjectTool, groups: ['readwrite'] },
  { factory: deleteObjectTool, groups: ['readwrite'] },
  { factory: copyObjectTool, groups: ['readwrite'] },
  { factory: createBucketTool, groups: ['readwrite'] },
  { factory: deleteBucketTool, groups: ['readwrite'] },
];

/**
 * Get all tool names for documentation/help purposes.
 */
export function getAllToolNames(): string[] {
  // Create a temporary server just to get tool names
  const mockServer = { setRequestHandler: () => {} } as unknown as Server;
  const mockFactory = (() => {}) as unknown as S3ClientFactory;
  return ALL_TOOLS.map((def) => def.factory(mockServer, mockFactory).name);
}

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * @param clientFactory - Factory function that creates S3 client instances
 * @param enabledGroups - Optional array of enabled tool groups (defaults to all)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: S3ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.S3_ENABLED_TOOLGROUPS);

  // Parse individual tool filters
  const { enabledTools, disabledTools } = parseToolFilters(
    process.env.S3_ENABLED_TOOLS,
    process.env.S3_DISABLED_TOOLS
  );

  return (server: Server) => {
    // Filter tools by enabled groups first
    const filteredToolDefs = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g)));

    // Create tool instances
    let tools = filteredToolDefs.map((def) => def.factory(server, clientFactory));

    // Apply individual tool filters
    if (enabledTools) {
      tools = tools.filter((tool) => enabledTools.has(tool.name));
    }
    tools = tools.filter((tool) => !disabledTools.has(tool.name));

    // Log configuration for debugging
    if (process.env.S3_ENABLED_TOOLGROUPS) {
      logWarning('config', `Tool groups enabled: ${groups.join(', ')}`);
    }
    if (enabledTools) {
      logWarning('config', `Enabled tools filter: ${[...enabledTools].join(', ')}`);
    }
    if (disabledTools.size > 0) {
      logWarning('config', `Disabled tools: ${[...disabledTools].join(', ')}`);
    }

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
  const register = createRegisterTools(factory as S3ClientFactory);
  register(server);
}
