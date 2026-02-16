import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { SerpApiClientFactory } from './server.js';
import { searchHotelsTool } from './tools/search-hotels.js';
import { getHotelDetailsTool } from './tools/get-hotel-details.js';
import { getHotelReviewsTool } from './tools/get-hotel-reviews.js';

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

type ToolFactory = (server: Server, clientFactory: SerpApiClientFactory) => Tool;

const ALL_TOOLS: ToolFactory[] = [searchHotelsTool, getHotelDetailsTool, getHotelReviewsTool];

const ALL_TOOL_NAMES = ['search_hotels', 'get_hotel_details', 'get_hotel_reviews'];

export function getAllToolNames(): string[] {
  return ALL_TOOL_NAMES;
}

export function createRegisterTools(clientFactory: SerpApiClientFactory) {
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
