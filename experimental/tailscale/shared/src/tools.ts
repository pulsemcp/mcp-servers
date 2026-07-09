import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getPolicyFile } from './tools/get-policy-file.js';
import { validatePolicyFile } from './tools/validate-policy-file.js';
import { updatePolicyFile } from './tools/update-policy-file.js';
import { listDevices } from './tools/list-devices.js';
import { getDevice } from './tools/get-device.js';
import { getDeviceRoutes } from './tools/get-device-routes.js';
import { authorizeDevice } from './tools/authorize-device.js';
import { setDeviceTags } from './tools/set-device-tags.js';
import { setDeviceRoutes } from './tools/set-device-routes.js';
import { deleteDevice } from './tools/delete-device.js';
import { listKeys } from './tools/list-keys.js';
import { getKey } from './tools/get-key.js';
import { createAuthKey } from './tools/create-auth-key.js';
import { createOAuthClient } from './tools/create-oauth-client.js';
import { deleteKey } from './tools/delete-key.js';

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together.
 *
 * Each group has two variants:
 * - Base group (e.g., 'policy'): Includes all tools (read + write operations)
 * - Readonly group (e.g., 'policy_readonly'): Includes only read operations
 *
 * Groups:
 * - policy / policy_readonly: Tailnet policy file (ACL) tools
 * - devices / devices_readonly: Device (node) management tools
 * - keys / keys_readonly: Auth-key and OAuth-client management tools
 */
export type ToolGroup =
  | 'policy'
  | 'policy_readonly'
  | 'devices'
  | 'devices_readonly'
  | 'keys'
  | 'keys_readonly';

/** Base groups without _readonly suffix */
type BaseToolGroup = 'policy' | 'devices' | 'keys';

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<any>;
}

interface ToolDefinition {
  factory: (server: Server, clientFactory: ClientFactory) => Tool;
  /** The base group this tool belongs to (without _readonly suffix) */
  group: BaseToolGroup;
  /** If true, this tool is excluded from _readonly groups */
  isWriteOperation: boolean;
}

const ALL_TOOLS: ToolDefinition[] = [
  // Policy (ACL) tools
  { factory: getPolicyFile, group: 'policy', isWriteOperation: false },
  { factory: validatePolicyFile, group: 'policy', isWriteOperation: false },
  { factory: updatePolicyFile, group: 'policy', isWriteOperation: true },
  // Device tools
  { factory: listDevices, group: 'devices', isWriteOperation: false },
  { factory: getDevice, group: 'devices', isWriteOperation: false },
  { factory: getDeviceRoutes, group: 'devices', isWriteOperation: false },
  { factory: authorizeDevice, group: 'devices', isWriteOperation: true },
  { factory: setDeviceTags, group: 'devices', isWriteOperation: true },
  { factory: setDeviceRoutes, group: 'devices', isWriteOperation: true },
  { factory: deleteDevice, group: 'devices', isWriteOperation: true },
  // Auth-key & OAuth-client tools
  { factory: listKeys, group: 'keys', isWriteOperation: false },
  { factory: getKey, group: 'keys', isWriteOperation: false },
  { factory: createAuthKey, group: 'keys', isWriteOperation: true },
  { factory: createOAuthClient, group: 'keys', isWriteOperation: true },
  { factory: deleteKey, group: 'keys', isWriteOperation: true },
];

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = [
  'policy',
  'policy_readonly',
  'devices',
  'devices_readonly',
  'keys',
  'keys_readonly',
];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = ['policy', 'devices', 'keys'];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "policy,devices_readonly")
 * @returns Array of enabled tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  const groupsStr = enabledGroupsParam || process.env.TOOL_GROUPS || '';

  if (!groupsStr) {
    // Default: all base groups enabled (full read+write access)
    return [...BASE_TOOL_GROUPS];
  }

  const groups = groupsStr.split(',').map((g) => g.trim());
  const validGroups: ToolGroup[] = [];

  for (const group of groups) {
    if (
      VALID_TOOL_GROUPS.includes(group as ToolGroup) &&
      !validGroups.includes(group as ToolGroup)
    ) {
      validGroups.push(group as ToolGroup);
    } else if (!VALID_TOOL_GROUPS.includes(group as ToolGroup)) {
      console.warn(`Unknown tool group: ${group}`);
    }
  }

  return validGroups;
}

/**
 * Check if a tool should be included based on enabled groups
 * @param toolDef - The tool definition to check
 * @param enabledGroups - Array of enabled tool groups
 * @returns true if the tool should be included
 */
function shouldIncludeTool(toolDef: ToolDefinition, enabledGroups: ToolGroup[]): boolean {
  const baseGroup = toolDef.group;
  const readonlyGroup = `${baseGroup}_readonly` as ToolGroup;

  // Check if the base group (full access) is enabled
  if (enabledGroups.includes(baseGroup as ToolGroup)) {
    return true;
  }

  // Check if the readonly group is enabled (only include read operations)
  if (enabledGroups.includes(readonlyGroup) && !toolDef.isWriteOperation) {
    return true;
  }

  return false;
}

/**
 * Creates a function to register all tools with the server.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * Tool groups can be enabled/disabled via the TOOL_GROUPS environment variable
 * (comma-separated list, e.g., "policy,devices_readonly"). If not set, all base
 * tool groups are enabled by default (full read+write access).
 *
 * Available tool groups:
 * - policy / policy_readonly: Tailnet policy file (ACL) tools
 * - devices / devices_readonly: Device management tools
 * - keys / keys_readonly: Auth-key and OAuth-client management tools
 *
 * @param clientFactory - Factory function that creates client instances
 * @param enabledGroups - Optional comma-separated list of enabled tool groups (overrides env var)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: string) {
  return (server: Server) => {
    const enabledToolGroups = parseEnabledToolGroups(enabledGroups);

    // Filter tools based on enabled groups
    const enabledTools = ALL_TOOLS.filter((toolDef) =>
      shouldIncludeTool(toolDef, enabledToolGroups)
    );

    // Create tool instances
    const tools = enabledTools.map((toolDef) => toolDef.factory(server, clientFactory));

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
