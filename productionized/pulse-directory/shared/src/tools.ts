import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory } from './client.js';
import { listServersTool } from './tools/list-servers.js';
import { getServerTool } from './tools/get-server.js';

export function createRegisterTools(clientFactory: ClientFactory) {
  return (server: Server) => {
    // Create tool instances
    const tools = [listServersTool(server, clientFactory), getServerTool(server, clientFactory)];

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
