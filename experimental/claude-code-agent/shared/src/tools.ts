import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { initAgentTool } from './tools/init-agent.js';
import { findServersTool } from './tools/find-servers.js';
import { installServersTool } from './tools/install-servers.js';
import { chatTool } from './tools/chat.js';
import { inspectTranscriptTool } from './tools/inspect-transcript.js';
import { stopAgentTool } from './tools/stop-agent.js';
import { getServerCapabilitiesTool } from './tools/get-server-capabilities.js';
import { diagnoseAgentTool } from './tools/diagnose-agent.js';

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * @param clientFactory - Factory function that creates client instances
 * @param serverConfigsPath - Path to servers.json configuration file
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: ClientFactory, serverConfigsPath: string) {
  return (server: Server) => {
    // Create tool instances
    const tools = [
      initAgentTool(server, clientFactory),
      findServersTool(server, clientFactory),
      installServersTool(server, clientFactory),
      chatTool(server, clientFactory),
      inspectTranscriptTool(server, clientFactory),
      stopAgentTool(server, clientFactory),
      getServerCapabilitiesTool(server, serverConfigsPath),
      diagnoseAgentTool(server, clientFactory),
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
  const register = createRegisterTools(factory, '');
  register(server);
}
