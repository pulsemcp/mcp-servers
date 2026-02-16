import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { FlightsClientFactory } from './server.js';
import { searchFlightsTool } from './tools/search-flights.js';
import { getDateGridTool } from './tools/get-date-grid.js';
import { findAirportCodeTool } from './tools/find-airport-code.js';

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

type ToolFactory = (server: Server, clientFactory: FlightsClientFactory) => Tool;

const ALL_TOOLS: ToolFactory[] = [searchFlightsTool, getDateGridTool, findAirportCodeTool];

export function getAllToolNames(): string[] {
  const mockServer = { setRequestHandler: () => {} } as unknown as Server;
  const mockFactory = (() => {}) as unknown as FlightsClientFactory;
  return ALL_TOOLS.map((factory) => factory(mockServer, mockFactory).name);
}

export function createRegisterTools(clientFactory: FlightsClientFactory) {
  return (server: Server) => {
    const tools = ALL_TOOLS.map((factory) => factory(server, clientFactory));

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
