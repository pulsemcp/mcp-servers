import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory } from './server.js';

import { listEventsTool } from './tools/list-events.js';
import { getEventTool } from './tools/get-event.js';
import { createEventTool } from './tools/create-event.js';
import { updateEventTool } from './tools/update-event.js';
import { deleteEventTool } from './tools/delete-event.js';
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
 * Available tool groups for Google Calendar MCP server
 * - readonly: Read-only operations (list_calendar_events, get_calendar_event, list_calendars, query_calendar_freebusy)
 * - readwrite: Read and write operations (includes readonly + create/update/delete_calendar_event)
 */
export type ToolGroup = 'readonly' | 'readwrite';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite'];

interface ToolDefinition {
  factory: ToolFactory;
  /** Which tool groups this tool belongs to */
  groups: ToolGroup[];
}

/**
 * All available tools with their group assignments
 *
 * readonly: list_calendar_events, get_calendar_event, list_calendars, query_calendar_freebusy
 * readwrite: all readonly tools + create_calendar_event, update_calendar_event, delete_calendar_event
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only tools (available in all groups)
  { factory: listEventsTool, groups: ['readonly', 'readwrite'] },
  { factory: getEventTool, groups: ['readonly', 'readwrite'] },
  { factory: listCalendarsTool, groups: ['readonly', 'readwrite'] },
  { factory: queryFreebusyTool, groups: ['readonly', 'readwrite'] },
  // Write tools (only in readwrite)
  { factory: createEventTool, groups: ['readwrite'] },
  { factory: updateEventTool, groups: ['readwrite'] },
  { factory: deleteEventTool, groups: ['readwrite'] },
];

/**
 * Parses the ENABLED_TOOLGROUPS environment variable
 * @param enabledGroupsParam - Comma-separated list of tool groups
 * @returns Array of valid tool groups
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
      `Warning: No valid tool groups found in "${enabledGroupsParam}". ` +
        `Valid groups: ${ALL_TOOL_GROUPS.join(', ')}. Using all groups.`
    );
    return ALL_TOOL_GROUPS;
  }

  return validGroups;
}

/**
 * Gets all available tool group names
 */
export function getAvailableToolGroups(): ToolGroup[] {
  return [...ALL_TOOL_GROUPS];
}

/**
 * Creates a function to register tools with the server based on enabled groups
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  // Parse enabled groups from environment or use provided array
  const groups = enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);

  return (server: Server) => {
    // Filter tools by enabled groups and create instances
    const tools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map((def) =>
      def.factory(server, clientFactory)
    );

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
