import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getChannelsTool } from './tools/get-channels.js';
import { getChannelTool } from './tools/get-channel.js';
import { getThreadTool } from './tools/get-thread.js';
import { createThreadTool } from './tools/create-thread.js';
import { addMessageToThreadTool } from './tools/add-message-to-thread.js';
import { closeThreadTool } from './tools/close-thread.js';

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * @param clientFactory - Factory function that creates client instances
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: ClientFactory) {
  return (server: Server) => {
    // Create tool instances
    const tools = [
      getChannelsTool(server, clientFactory),
      getChannelTool(server, clientFactory),
      getThreadTool(server, clientFactory),
      createThreadTool(server, clientFactory),
      addMessageToThreadTool(server, clientFactory),
      closeThreadTool(server, clientFactory),
    ];

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
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

// Keep the original registerTools for backward compatibility
export function registerTools(server: Server) {
  // This maintains compatibility but doesn't use dependency injection
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
