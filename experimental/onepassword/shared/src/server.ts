import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { IOnePasswordClient } from './types.js';
import { OnePasswordClient } from './onepassword-client/onepassword-client.js';

// Re-export the interface for convenience
export { IOnePasswordClient } from './types.js';
export { OnePasswordClient } from './onepassword-client/onepassword-client.js';

export type ClientFactory = () => IOnePasswordClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'onepassword-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const serviceAccountToken = process.env.OP_SERVICE_ACCOUNT_TOKEN;

        if (!serviceAccountToken) {
          throw new Error('OP_SERVICE_ACCOUNT_TOKEN environment variable must be configured');
        }

        return new OnePasswordClient(serviceAccountToken);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
