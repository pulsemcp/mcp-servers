import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { AeroApiClientFactory } from './server.js';
import { searchFlightsByIdentTool } from './tools/search-flights-by-ident.js';
import { getFlightTrackTool } from './tools/get-flight-track.js';
import { getAirportInfoTool } from './tools/get-airport-info.js';
import { getAirportFlightsTool } from './tools/get-airport-flights.js';
import { getAirportDelaysTool } from './tools/get-airport-delays.js';

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

type ToolFactory = (server: Server, clientFactory: AeroApiClientFactory) => Tool;

const ALL_TOOLS: ToolFactory[] = [
  searchFlightsByIdentTool,
  getFlightTrackTool,
  getAirportInfoTool,
  getAirportFlightsTool,
  getAirportDelaysTool,
];

const ALL_TOOL_NAMES = [
  'search_flights_by_ident',
  'get_flight_track',
  'get_airport_info',
  'get_airport_flights',
  'get_airport_delays',
];

export function getAllToolNames(): string[] {
  return ALL_TOOL_NAMES;
}

export function createRegisterTools(clientFactory: AeroApiClientFactory) {
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
