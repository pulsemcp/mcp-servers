import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getTracesTool } from './tools/get-traces.js';
import { getTraceDetailTool } from './tools/get-trace-detail.js';
import { getObservationsTool } from './tools/get-observations.js';
import { getObservationTool } from './tools/get-observation.js';

export type ToolGroup = 'readonly';

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
  { factory: getTracesTool, groups: ['readonly'] },
  { factory: getTraceDetailTool, groups: ['readonly'] },
  { factory: getObservationsTool, groups: ['readonly'] },
  { factory: getObservationTool, groups: ['readonly'] },
];

export function createRegisterTools(clientFactory: ClientFactory) {
  return (server: Server) => {
    const tools = ALL_TOOLS.map((def) => def.factory(server, clientFactory));

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
    ) as never;
  };
  const register = createRegisterTools(factory);
  register(server);
}
