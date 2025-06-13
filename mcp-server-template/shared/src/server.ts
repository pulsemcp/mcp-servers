import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';

// Example client interface - replace with your actual client
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IExampleClient {
  // Define your client methods here
  // Example: getData(id: string): Promise<unknown>;
}

// Example client implementation - replace with your actual implementation
export class ExampleClient implements IExampleClient {
  constructor(private apiKey: string) {}
  
  // Implement your client methods here
}

export type ClientFactory = () => IExampleClient;

export function createMCPServer() {
  const server = new McpServer(
    {
      name: 'mcp-server-NAME',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: McpServer, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        // Example: Get configuration from environment variables
        const apiKey = process.env.YOUR_API_KEY;

        if (!apiKey) {
          throw new Error('YOUR_API_KEY environment variable must be configured');
        }

        return new ExampleClient(apiKey);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}