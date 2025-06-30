import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory, StrategyConfigFactory } from './server.js';
import { scrapeTool } from './tools/scrape.js';

export function createRegisterTools(
  clientFactory: ClientFactory,
  strategyConfigFactory: StrategyConfigFactory
) {
  return (server: Server) => {
    // Create tool instances
    const tools = [scrapeTool(server, clientFactory, strategyConfigFactory)];

    // Register tool definitions
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Register tool handlers
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
