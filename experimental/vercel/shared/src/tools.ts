import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { listDeploymentsTool } from './tools/list-deployments.js';
import { getDeploymentTool } from './tools/get-deployment.js';
import { listProjectsTool } from './tools/list-projects.js';
import { createDeploymentTool } from './tools/create-deployment.js';
import { cancelDeploymentTool } from './tools/cancel-deployment.js';
import { deleteDeploymentTool } from './tools/delete-deployment.js';
import { promoteDeploymentTool } from './tools/promote-deployment.js';
import { rollbackDeploymentTool } from './tools/rollback-deployment.js';
import { getDeploymentEventsTool } from './tools/get-deployment-events.js';
import { getRuntimeLogsTool } from './tools/get-runtime-logs.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================

export type ToolGroup = 'readonly' | 'readwrite';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite'];

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

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

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
  // Readonly tools - deployment and project listing/details
  { factory: listDeploymentsTool, groups: ['readonly', 'readwrite'] },
  { factory: getDeploymentTool, groups: ['readonly', 'readwrite'] },
  { factory: listProjectsTool, groups: ['readonly', 'readwrite'] },
  { factory: getDeploymentEventsTool, groups: ['readonly', 'readwrite'] },
  { factory: getRuntimeLogsTool, groups: ['readonly', 'readwrite'] },

  // Readwrite tools - deployment management
  { factory: createDeploymentTool, groups: ['readwrite'] },
  { factory: cancelDeploymentTool, groups: ['readwrite'] },
  { factory: deleteDeploymentTool, groups: ['readwrite'] },
  { factory: promoteDeploymentTool, groups: ['readwrite'] },
  { factory: rollbackDeploymentTool, groups: ['readwrite'] },
];

export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.VERCEL_ENABLED_TOOLGROUPS);

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
