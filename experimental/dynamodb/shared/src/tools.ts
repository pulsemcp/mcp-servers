import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { ToolGroup, DynamoDBToolName, ToolFilterConfig, TableFilterConfig } from './types.js';

// Import all tools
import { listTablesTool } from './tools/list-tables.js';
import { describeTableTool } from './tools/describe-table.js';
import { getItemTool } from './tools/get-item.js';
import { queryTool } from './tools/query.js';
import { scanTool } from './tools/scan.js';
import { putItemTool } from './tools/put-item.js';
import { updateItemTool } from './tools/update-item.js';
import { deleteItemTool } from './tools/delete-item.js';
import { batchGetItemsTool } from './tools/batch-get-items.js';
import { batchWriteItemsTool } from './tools/batch-write-items.js';
import { createTableTool } from './tools/create-table.js';
import { deleteTableTool } from './tools/delete-table.js';
import { updateTableTool } from './tools/update-table.js';

// =============================================================================
// TOOL FILTERING SYSTEM
// =============================================================================
// This DynamoDB MCP server provides fine-grained control over which tools are
// available. You can filter tools in three ways:
//
// 1. TOOL GROUPS (DYNAMODB_ENABLED_TOOL_GROUPS):
//    - 'readonly': list_tables, describe_table, get_item, query, scan, batch_get_items
//    - 'readwrite': put_item, update_item, delete_item, batch_write_items
//    - 'admin': create_table, delete_table, update_table
//    Example: DYNAMODB_ENABLED_TOOL_GROUPS="readonly" (only read operations)
//    Default: All groups enabled
//
// 2. ENABLED TOOLS (DYNAMODB_ENABLED_TOOLS):
//    Whitelist specific tools (comma-separated)
//    Example: DYNAMODB_ENABLED_TOOLS="dynamodb_get_item,dynamodb_query"
//
// 3. DISABLED TOOLS (DYNAMODB_DISABLED_TOOLS):
//    Blacklist specific tools (comma-separated)
//    Example: DYNAMODB_DISABLED_TOOLS="dynamodb_delete_table,dynamodb_create_table"
//
// Priority: ENABLED_TOOLS > DISABLED_TOOLS > ENABLED_TOOL_GROUPS
//
// 4. ALLOWED TABLES (DYNAMODB_ALLOWED_TABLES):
//    Restrict operations to specific tables (comma-separated)
//    Example: DYNAMODB_ALLOWED_TABLES="Users,Orders,Products"
//    When set, operations on other tables are declined and list_tables filters results.
//    Default: All tables allowed
// =============================================================================

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite', 'admin'];

const ALL_TOOL_NAMES: DynamoDBToolName[] = [
  'dynamodb_list_tables',
  'dynamodb_describe_table',
  'dynamodb_get_item',
  'dynamodb_query',
  'dynamodb_scan',
  'dynamodb_put_item',
  'dynamodb_update_item',
  'dynamodb_delete_item',
  'dynamodb_batch_get_items',
  'dynamodb_batch_write_items',
  'dynamodb_create_table',
  'dynamodb_delete_table',
  'dynamodb_update_table',
];

/**
 * Parse tool filter configuration from environment variables.
 */
export function parseToolFilterConfig(): ToolFilterConfig {
  const config: ToolFilterConfig = {};

  // Parse enabled tool groups
  const groupsEnv = process.env.DYNAMODB_ENABLED_TOOL_GROUPS;
  if (groupsEnv) {
    const groups = groupsEnv
      .split(',')
      .map((g) => g.trim().toLowerCase())
      .filter((g): g is ToolGroup => ALL_TOOL_GROUPS.includes(g as ToolGroup));
    if (groups.length > 0) {
      config.enabledToolGroups = groups;
    }
  }

  // Parse enabled tools (whitelist)
  const enabledEnv = process.env.DYNAMODB_ENABLED_TOOLS;
  if (enabledEnv) {
    const tools = enabledEnv
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t): t is DynamoDBToolName => ALL_TOOL_NAMES.includes(t as DynamoDBToolName));
    if (tools.length > 0) {
      config.enabledTools = tools;
    }
  }

  // Parse disabled tools (blacklist)
  const disabledEnv = process.env.DYNAMODB_DISABLED_TOOLS;
  if (disabledEnv) {
    const tools = disabledEnv
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t): t is DynamoDBToolName => ALL_TOOL_NAMES.includes(t as DynamoDBToolName));
    if (tools.length > 0) {
      config.disabledTools = tools;
    }
  }

  return config;
}

/**
 * Parse table filter configuration from environment variables.
 */
export function parseTableFilterConfig(): TableFilterConfig {
  const config: TableFilterConfig = {};

  const tablesEnv = process.env.DYNAMODB_ALLOWED_TABLES;
  if (tablesEnv) {
    const tables = tablesEnv
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tables.length > 0) {
      config.allowedTables = tables;
    }
  }

  return config;
}

/**
 * Check if a table is allowed based on the filter configuration.
 * Returns true if no filter is configured or if the table is in the allowed list.
 */
export function isTableAllowed(tableName: string, config: TableFilterConfig): boolean {
  if (!config.allowedTables || config.allowedTables.length === 0) {
    return true;
  }
  return config.allowedTables.includes(tableName);
}

/**
 * Filter a list of table names based on the table filter configuration.
 */
export function filterAllowedTables(tableNames: string[], config: TableFilterConfig): string[] {
  if (!config.allowedTables || config.allowedTables.length === 0) {
    return tableNames;
  }
  return tableNames.filter((name) => config.allowedTables!.includes(name));
}

/**
 * Create an error response for table access denied.
 */
export function createTableAccessDeniedError(tableName: string) {
  return {
    content: [
      {
        type: 'text',
        text: `Access denied: Table '${tableName}' is not in the allowed tables list. Configure DYNAMODB_ALLOWED_TABLES to include this table.`,
      },
    ],
    isError: true,
  };
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

interface Tool {
  name: DynamoDBToolName;
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

type ToolFactory = (
  server: Server,
  clientFactory: ClientFactory,
  tableFilterConfig?: TableFilterConfig
) => Tool;

interface ToolDefinition {
  factory: ToolFactory;
  name: DynamoDBToolName;
  groups: ToolGroup[];
}

/**
 * All available tools with their group assignments.
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Readonly tools
  { factory: listTablesTool, name: 'dynamodb_list_tables', groups: ['readonly'] },
  { factory: describeTableTool, name: 'dynamodb_describe_table', groups: ['readonly'] },
  { factory: getItemTool, name: 'dynamodb_get_item', groups: ['readonly'] },
  { factory: queryTool, name: 'dynamodb_query', groups: ['readonly'] },
  { factory: scanTool, name: 'dynamodb_scan', groups: ['readonly'] },
  { factory: batchGetItemsTool, name: 'dynamodb_batch_get_items', groups: ['readonly'] },

  // ReadWrite tools
  { factory: putItemTool, name: 'dynamodb_put_item', groups: ['readwrite'] },
  { factory: updateItemTool, name: 'dynamodb_update_item', groups: ['readwrite'] },
  { factory: deleteItemTool, name: 'dynamodb_delete_item', groups: ['readwrite'] },
  { factory: batchWriteItemsTool, name: 'dynamodb_batch_write_items', groups: ['readwrite'] },

  // Admin tools
  { factory: createTableTool, name: 'dynamodb_create_table', groups: ['admin'] },
  { factory: deleteTableTool, name: 'dynamodb_delete_table', groups: ['admin'] },
  { factory: updateTableTool, name: 'dynamodb_update_table', groups: ['admin'] },
];

/**
 * Filter tools based on configuration.
 * Priority: enabledTools > disabledTools > enabledToolGroups
 */
function filterTools(tools: ToolDefinition[], config: ToolFilterConfig): ToolDefinition[] {
  // If specific tools are enabled, only use those
  if (config.enabledTools && config.enabledTools.length > 0) {
    return tools.filter((t) => config.enabledTools!.includes(t.name));
  }

  // Start with all tools or group-filtered tools
  let filteredTools = tools;

  if (config.enabledToolGroups && config.enabledToolGroups.length > 0) {
    filteredTools = tools.filter((t) =>
      t.groups.some((g) => config.enabledToolGroups!.includes(g))
    );
  }

  // Remove disabled tools
  if (config.disabledTools && config.disabledTools.length > 0) {
    filteredTools = filteredTools.filter((t) => !config.disabledTools!.includes(t.name));
  }

  return filteredTools;
}

/**
 * Creates a function to register all tools with the server.
 */
export function createRegisterTools(
  clientFactory: ClientFactory,
  toolFilterConfig?: ToolFilterConfig,
  tableFilterConfig?: TableFilterConfig
) {
  const toolConfig = toolFilterConfig || parseToolFilterConfig();
  const tableConfig = tableFilterConfig || parseTableFilterConfig();

  return (server: Server) => {
    // Filter tools and create instances
    const filteredToolDefs = filterTools(ALL_TOOLS, toolConfig);
    const tools = filteredToolDefs.map((def) => def.factory(server, clientFactory, tableConfig));

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

// Keep for backward compatibility
export function registerTools(server: Server) {
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}

// Re-export types
export { ToolGroup, DynamoDBToolName, ToolFilterConfig, TableFilterConfig } from './types.js';
