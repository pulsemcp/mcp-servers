import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getEnvVarsTool } from './tools/get-env-vars.js';
import { getEnvVarTool } from './tools/get-env-var.js';
import { setEnvVarTool } from './tools/set-env-var.js';
import { deleteEnvVarsTool } from './tools/delete-env-vars.js';
import { triggerDeployTool } from './tools/trigger-deploy.js';
import { checkDeployTool } from './tools/check-deploy.js';

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
    // Check configuration
    const hasServerIP = !!process.env.WEB_SERVER_IP_ADDRESS;
    const isReadonly = process.env.READONLY !== 'false'; // Default true
    const allowDeploys = process.env.ALLOW_DEPLOYS !== 'false'; // Default true

    // Create tool instances conditionally
    const tools: Array<{
      name: string;
      description: string;
      inputSchema: unknown;
      handler: (args: unknown) => Promise<{
        content: Array<{ type: string; text: string }>;
        isError?: boolean;
      }>;
    }> = [];

    // SSH-based read tools (only if WEB_SERVER_IP_ADDRESS is configured)
    if (hasServerIP) {
      tools.push(getEnvVarsTool(server, clientFactory));
      tools.push(getEnvVarTool(server, clientFactory));
    }

    // Write tools (only if not in readonly mode)
    if (!isReadonly) {
      tools.push(setEnvVarTool(server, clientFactory));
      tools.push(deleteEnvVarsTool(server, clientFactory));
    }

    // Deployment tools (only if deployments are allowed)
    if (allowDeploys) {
      tools.push(triggerDeployTool(server, clientFactory));
      tools.push(checkDeployTool(server, clientFactory));
    }

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
