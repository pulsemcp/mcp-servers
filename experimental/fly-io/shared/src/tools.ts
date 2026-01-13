import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { listAppsTool } from './tools/list-apps.js';
import { getAppTool } from './tools/get-app.js';
import { createAppTool } from './tools/create-app.js';
import { deleteAppTool } from './tools/delete-app.js';
import { listMachinesTool } from './tools/list-machines.js';
import { getMachineTool } from './tools/get-machine.js';
import { createMachineTool } from './tools/create-machine.js';
import { updateMachineTool } from './tools/update-machine.js';
import { deleteMachineTool } from './tools/delete-machine.js';
import { startMachineTool } from './tools/start-machine.js';
import { stopMachineTool } from './tools/stop-machine.js';
import { restartMachineTool } from './tools/restart-machine.js';
import { suspendMachineTool } from './tools/suspend-machine.js';
import { waitMachineTool } from './tools/wait-machine.js';
import { getMachineEventsTool } from './tools/get-machine-events.js';
import { getLogsTool } from './tools/get-logs.js';
import { machineExecTool } from './tools/machine-exec.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
// This is useful for permission-based access control or feature flags.
//
// Two types of groups are supported and can be combined:
//
// 1. PERMISSION GROUPS (what operations are allowed):
//    - 'readonly': Read-only operations (list, get)
//    - 'write': Write operations (create, update, start, stop)
//    - 'admin': Administrative operations (delete)
//
// 2. FEATURE GROUPS (what features are enabled):
//    - 'apps': App management tools (list_apps, get_app, create_app, delete_app)
//    - 'machines': Machine management tools (list, get, create, update, delete, start, stop, etc.)
//    - 'logs': Log retrieval tools (get_logs)
//    - 'ssh': Remote execution tools (machine_exec)
//
// Usage: Set ENABLED_TOOLGROUPS environment variable to a comma-separated list
// Examples:
//   ENABLED_TOOLGROUPS="readonly,write" (excludes 'admin' tools, all features enabled)
//   ENABLED_TOOLGROUPS="machines,logs" (all permissions, only machines and logs features)
//   ENABLED_TOOLGROUPS="readonly,machines" (read-only access to machines only)
//
// Default: All groups enabled when not specified
//
// APP SCOPING
// =============================================================================
// When FLY_IO_APP_NAME is set, the server operates in "scoped mode":
// - All app management tools (list_apps, get_app, create_app, delete_app) are disabled
// - Machine tools are restricted to the configured app only
// - The app_name parameter becomes optional and defaults to the configured app
// =============================================================================

/**
 * Permission-based tool groups (what operations are allowed)
 */
export type PermissionGroup = 'readonly' | 'write' | 'admin';

/**
 * Feature-based tool groups (what features are enabled)
 */
export type FeatureGroup = 'apps' | 'machines' | 'logs' | 'ssh';

/**
 * All available tool groups (both permission and feature based)
 */
export type ToolGroup = PermissionGroup | FeatureGroup;

const ALL_PERMISSION_GROUPS: PermissionGroup[] = ['readonly', 'write', 'admin'];
const ALL_FEATURE_GROUPS: FeatureGroup[] = ['apps', 'machines', 'logs', 'ssh'];
const ALL_TOOL_GROUPS: ToolGroup[] = [...ALL_PERMISSION_GROUPS, ...ALL_FEATURE_GROUPS];

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
  /** Permission groups this tool belongs to (readonly, write, admin) */
  permissionGroups: PermissionGroup[];
  /** Feature group this tool belongs to (apps, machines, logs, ssh) */
  featureGroup: FeatureGroup;
  /** If true, this tool manages apps and will be disabled when FLY_IO_APP_NAME is set */
  isAppManagement?: boolean;
  /** If true, this tool has an app_name parameter that should be scoped when FLY_IO_APP_NAME is set */
  requiresAppName?: boolean;
}

/**
 * All available tools with their group assignments.
 * Each tool has permission groups (what operations are allowed) and a feature group (what feature it belongs to).
 */
const ALL_TOOLS: ToolDefinition[] = [
  // App management tools (disabled when FLY_IO_APP_NAME is set)
  {
    factory: listAppsTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'apps',
    isAppManagement: true,
  },
  {
    factory: getAppTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'apps',
    isAppManagement: true,
  },
  {
    factory: createAppTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'apps',
    isAppManagement: true,
  },
  {
    factory: deleteAppTool,
    permissionGroups: ['admin'],
    featureGroup: 'apps',
    isAppManagement: true,
  },
  // Machine tools - readonly (require app_name, scoped when FLY_IO_APP_NAME is set)
  {
    factory: listMachinesTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: getMachineTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: getMachineEventsTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  // Machine tools - write (require app_name, scoped when FLY_IO_APP_NAME is set)
  {
    factory: createMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: updateMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: startMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: stopMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: restartMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: suspendMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  {
    factory: waitMachineTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  // Machine tools - admin (require app_name, scoped when FLY_IO_APP_NAME is set)
  {
    factory: deleteMachineTool,
    permissionGroups: ['admin'],
    featureGroup: 'machines',
    requiresAppName: true,
  },
  // Logs tools
  {
    factory: getLogsTool,
    permissionGroups: ['readonly', 'write', 'admin'],
    featureGroup: 'logs',
    requiresAppName: true,
  },
  // SSH/exec tools
  {
    factory: machineExecTool,
    permissionGroups: ['write', 'admin'],
    featureGroup: 'ssh',
    requiresAppName: true,
  },
];

/**
 * Configuration options for tool registration
 */
export interface RegisterToolsOptions {
  enabledGroups?: ToolGroup[];
  scopedAppName?: string;
}

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * @param clientFactory - Factory function that creates client instances
 * @param options - Optional configuration (enabledGroups, scopedAppName)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(
  clientFactory: ClientFactory,
  options?: ToolGroup[] | RegisterToolsOptions
) {
  // Handle both old signature (ToolGroup[]) and new signature (RegisterToolsOptions)
  const opts: RegisterToolsOptions = Array.isArray(options)
    ? { enabledGroups: options }
    : options || {};

  const groups = opts.enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);
  // Validate scopedAppName - treat empty strings as undefined
  const rawScopedAppName = opts.scopedAppName ?? process.env.FLY_IO_APP_NAME;
  const scopedAppName = rawScopedAppName?.trim() || undefined;

  return (server: Server) => {
    // Separate enabled groups into permission and feature groups
    const enabledPermissions = groups.filter((g): g is PermissionGroup =>
      ALL_PERMISSION_GROUPS.includes(g as PermissionGroup)
    );
    const enabledFeatures = groups.filter((g): g is FeatureGroup =>
      ALL_FEATURE_GROUPS.includes(g as FeatureGroup)
    );

    // If no permission groups specified, enable all permissions
    // If no feature groups specified, enable all features
    const effectivePermissions =
      enabledPermissions.length > 0 ? enabledPermissions : ALL_PERMISSION_GROUPS;
    const effectiveFeatures = enabledFeatures.length > 0 ? enabledFeatures : ALL_FEATURE_GROUPS;

    // Filter tools: must match at least one permission group AND the feature group must be enabled
    let filteredTools = ALL_TOOLS.filter(
      (def) =>
        def.permissionGroups.some((p) => effectivePermissions.includes(p)) &&
        effectiveFeatures.includes(def.featureGroup)
    );

    // When app is scoped, remove app management tools
    if (scopedAppName) {
      filteredTools = filteredTools.filter((def) => !def.isAppManagement);
    }

    // Create tool instances
    const toolInstances = filteredTools.map((def) => ({
      tool: def.factory(server, clientFactory),
      requiresAppName: def.requiresAppName,
    }));

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolInstances.map(({ tool, requiresAppName }) => {
          // When scoped, modify the schema to make app_name optional and add note to description
          if (scopedAppName && requiresAppName) {
            const modifiedSchema = { ...tool.inputSchema };
            // Remove app_name from required array
            if (modifiedSchema.required) {
              modifiedSchema.required = modifiedSchema.required.filter(
                (r: string) => r !== 'app_name'
              );
              if (modifiedSchema.required.length === 0) {
                delete modifiedSchema.required;
              }
            }
            // Update app_name description to indicate it's scoped
            if (modifiedSchema.properties?.app_name) {
              modifiedSchema.properties = {
                ...modifiedSchema.properties,
                app_name: {
                  ...(modifiedSchema.properties.app_name as object),
                  description: `Optional. Defaults to "${scopedAppName}" (configured via FLY_IO_APP_NAME).`,
                },
              };
            }
            return {
              name: tool.name,
              description: `${tool.description}\n\n**Note:** This server is scoped to app "${scopedAppName}".`,
              inputSchema: modifiedSchema,
            };
          }
          return {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          };
        }),
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const toolEntry = toolInstances.find((t) => t.tool.name === name);
      if (!toolEntry) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // When scoped, inject or validate app_name
      let processedArgs = args;
      if (scopedAppName && toolEntry.requiresAppName) {
        const argsObj = (args || {}) as Record<string, unknown>;
        const providedAppName = argsObj.app_name as string | undefined;
        // Compare case-insensitively since Fly.io app names are normalized to lowercase
        if (providedAppName && providedAppName.toLowerCase() !== scopedAppName.toLowerCase()) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: This server is scoped to app "${scopedAppName}". Cannot operate on app "${providedAppName}".`,
              },
            ],
            isError: true,
          };
        }
        // Inject the scoped app name
        processedArgs = { ...argsObj, app_name: scopedAppName };
      }

      return await toolEntry.tool.handler(processedArgs);
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
