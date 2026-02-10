import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { GCSClientFactory } from './server.js';
import { listBucketsTool } from './tools/list-buckets.js';
import { listObjectsTool } from './tools/list-objects.js';
import { getObjectTool } from './tools/get-object.js';
import { putObjectTool } from './tools/put-object.js';
import { deleteObjectTool } from './tools/delete-object.js';
import { createBucketTool } from './tools/create-bucket.js';
import { deleteBucketTool } from './tools/delete-bucket.js';
import { copyObjectTool } from './tools/copy-object.js';
import { headBucketTool } from './tools/head-bucket.js';
import { logWarning, logInfo } from './logging.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
//
// Usage: Set GCS_ENABLED_TOOLGROUPS environment variable to a comma-separated list
// Example: GCS_ENABLED_TOOLGROUPS="readonly" (only read operations)
// Example: GCS_ENABLED_TOOLGROUPS="readonly,readwrite" (all operations)
// Default: All groups enabled when not specified
//
// Individual tools can also be enabled/disabled using GCS_ENABLED_TOOLS or GCS_DISABLED_TOOLS:
// GCS_ENABLED_TOOLS="list_buckets,get_object" - only enable these specific tools
// GCS_DISABLED_TOOLS="delete_bucket,delete_object" - disable these specific tools
//
// Bucket constraint: Set GCS_BUCKET to constrain all operations to a single bucket.
// When set, bucket-level tools (list_buckets, create_bucket, delete_bucket, head_bucket)
// are hidden and the bucket parameter is automatically injected for object operations.
// =============================================================================

/**
 * Available tool groups for GCS operations.
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

type ToolFactory = (server: Server, clientFactory: GCSClientFactory) => Tool;

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
  /** If true, this tool operates at the bucket level and is hidden when GCS_BUCKET is set */
  bucketLevelOnly?: boolean;
  /** List of bucket parameter names to inject when GCS_BUCKET is set */
  bucketParams?: string[];
}

/**
 * All available GCS tools with their group assignments.
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only operations
  { factory: listBucketsTool, groups: ['readonly'], bucketLevelOnly: true },
  { factory: listObjectsTool, groups: ['readonly'], bucketParams: ['bucket'] },
  { factory: getObjectTool, groups: ['readonly'], bucketParams: ['bucket'] },
  { factory: headBucketTool, groups: ['readonly'], bucketLevelOnly: true },
  // Write operations
  { factory: putObjectTool, groups: ['readwrite'], bucketParams: ['bucket'] },
  { factory: deleteObjectTool, groups: ['readwrite'], bucketParams: ['bucket'] },
  { factory: copyObjectTool, groups: ['readwrite'], bucketParams: ['sourceBucket', 'destBucket'] },
  { factory: createBucketTool, groups: ['readwrite'], bucketLevelOnly: true },
  { factory: deleteBucketTool, groups: ['readwrite'], bucketLevelOnly: true },
];

/**
 * Get all tool names for documentation/help purposes.
 */
export function getAllToolNames(): string[] {
  const mockServer = { setRequestHandler: () => {} } as unknown as Server;
  const mockFactory = (() => {}) as unknown as GCSClientFactory;
  return ALL_TOOLS.map((def) => def.factory(mockServer, mockFactory).name);
}

/**
 * Wraps a tool to inject bucket parameter(s) when GCS_BUCKET is set.
 */
function wrapToolForBucketConstraint(
  tool: Tool,
  bucketParams: string[],
  constrainedBucket: string
): Tool {
  // Modify input schema to remove bucket params (they're injected automatically)
  const newProperties = { ...tool.inputSchema.properties };
  const newRequired = (tool.inputSchema.required || []).filter((r) => !bucketParams.includes(r));

  for (const param of bucketParams) {
    delete newProperties[param];
  }

  // Update description to indicate bucket constraint
  const constraintNote = `\n\n**Note:** Operations are constrained to bucket "${constrainedBucket}".`;

  return {
    ...tool,
    description: tool.description + constraintNote,
    inputSchema: {
      type: 'object' as const,
      properties: newProperties,
      required: newRequired.length > 0 ? newRequired : undefined,
    },
    handler: async (args: unknown) => {
      // Inject the constrained bucket into the args
      const argsWithBucket = { ...(args as Record<string, unknown>) };
      for (const param of bucketParams) {
        argsWithBucket[param] = constrainedBucket;
      }
      return await tool.handler(argsWithBucket);
    },
  };
}

/**
 * Creates a function to register all tools with the server.
 */
export function createRegisterTools(clientFactory: GCSClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.GCS_ENABLED_TOOLGROUPS);
  const constrainedBucket = process.env.GCS_BUCKET;

  // Parse individual tool filters
  const { enabledTools, disabledTools } = parseToolFilters(
    process.env.GCS_ENABLED_TOOLS,
    process.env.GCS_DISABLED_TOOLS
  );

  return (server: Server) => {
    // Filter tools by enabled groups first
    let filteredToolDefs = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g)));

    // If GCS_BUCKET is set, filter out bucket-level-only tools
    if (constrainedBucket) {
      filteredToolDefs = filteredToolDefs.filter((def) => !def.bucketLevelOnly);
      logInfo('config', `Bucket constraint active: ${constrainedBucket}`);
    }

    // Create tool instances
    let tools = filteredToolDefs.map((def) => {
      const tool = def.factory(server, clientFactory);

      // If bucket is constrained and this tool has bucket params, wrap it
      if (constrainedBucket && def.bucketParams && def.bucketParams.length > 0) {
        return wrapToolForBucketConstraint(tool, def.bucketParams, constrainedBucket);
      }

      return tool;
    });

    // Apply individual tool filters
    if (enabledTools) {
      tools = tools.filter((tool) => enabledTools.has(tool.name));
    }
    tools = tools.filter((tool) => !disabledTools.has(tool.name));

    // Log configuration for debugging
    if (process.env.GCS_ENABLED_TOOLGROUPS) {
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
