import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import { IFlyIOClient, FlyIOClient } from './fly-io-client/fly-io-client.js';

// Re-export the client interface and implementation
export { IFlyIOClient, FlyIOClient };

export type ClientFactory = () => IFlyIOClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'fly-io-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const apiToken = process.env.FLY_IO_API_TOKEN;

        if (!apiToken) {
          throw new Error('FLY_IO_API_TOKEN environment variable must be configured');
        }

        return new FlyIOClient(apiToken);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
