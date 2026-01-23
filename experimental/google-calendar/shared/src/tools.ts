import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory } from './server.js';

import { listEventsTool } from './tools/list-events.js';
import { getEventTool } from './tools/get-event.js';
import { createEventTool } from './tools/create-event.js';
import { listCalendarsTool } from './tools/list-calendars.js';
import { queryFreebusyTool } from './tools/query-freebusy.js';

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

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 *
 * Each group has two variants:
 * - Base group (e.g., 'calendar'): Includes all tools (read + write operations)
 * - Readonly group (e.g., 'calendar_readonly'): Includes only read operations
 *
 * Groups:
 * - calendar / calendar_readonly: All calendar tools (events, calendars, freebusy)
 */
export type ToolGroup = 'calendar' | 'calendar_readonly';

/** Base groups without _readonly suffix */
type BaseToolGroup = 'calendar';

interface ToolDefinition {
  factory: ToolFactory;
  /** The base group this tool belongs to (without _readonly suffix) */
  group: BaseToolGroup;
  /** If true, this tool is excluded from _readonly groups */
  isWriteOperation: boolean;
}

const ALL_TOOLS: ToolDefinition[] = [
  // Calendar tools - read operations
  { factory: listEventsTool, group: 'calendar', isWriteOperation: false },
  { factory: getEventTool, group: 'calendar', isWriteOperation: false },
  { factory: listCalendarsTool, group: 'calendar', isWriteOperation: false },
  { factory: queryFreebusyTool, group: 'calendar', isWriteOperation: false },
  // Calendar tools - write operations
  { factory: createEventTool, group: 'calendar', isWriteOperation: true },
];

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = ['calendar', 'calendar_readonly'];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = ['calendar'];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "calendar_readonly")
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
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * Tool groups can be enabled/disabled via the TOOL_GROUPS environment variable
 * (comma-separated list, e.g., "calendar_readonly"). If not set, all
 * base tool groups are enabled by default (full read+write access).
 *
 * Available tool groups:
 * - calendar: All calendar tools (read + write)
 * - calendar_readonly: Calendar tools (read only - excludes create_event)
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

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      }

      return await tool.handler(args || {});
    });
  };
}
