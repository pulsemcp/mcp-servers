import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { searchFlightsTool } from './tools/search-flights.js';
import { getSearchHistoryTool } from './tools/get-search-history.js';
import { getUserMembershipTool, getUserPreferencesTool } from './tools/get-user-info.js';
import {
  getFlightRecommendationsTool,
  getHotelRecommendationsTool,
  getExplorerCountTool,
} from './tools/get-recommendations.js';

export type ToolGroup = 'readonly' | 'write' | 'admin';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'write', 'admin'];

export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  if (!enabledGroupsParam) {
    return ALL_TOOL_GROUPS;
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

const ALL_TOOLS: ToolDefinition[] = [
  // Flight search - the primary tool
  { factory: searchFlightsTool, groups: ['readonly', 'write', 'admin'] },
  // Search history
  { factory: getSearchHistoryTool, groups: ['readonly', 'write', 'admin'] },
  // User info tools
  { factory: getUserMembershipTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getUserPreferencesTool, groups: ['readonly', 'write', 'admin'] },
  // Explorer / recommendation tools
  { factory: getFlightRecommendationsTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getHotelRecommendationsTool, groups: ['readonly', 'write', 'admin'] },
  { factory: getExplorerCountTool, groups: ['readonly', 'write', 'admin'] },
];

export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);

  return (server: Server) => {
    const tools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map((def) =>
      def.factory(server, clientFactory)
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

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

export function registerTools(server: Server) {
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
