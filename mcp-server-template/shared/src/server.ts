import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';

// Example external API client interface - replace with your actual external API client
// This is for external services (REST APIs, databases, etc.) - NOT for MCP clients!
export interface IExampleClient {
  // Define your external API client methods here
  getItem(itemId: string): Promise<{ id: string; name: string; value: string }>;
  searchItems(
    query: string,
    options?: { limit?: number; offset?: number; sortBy?: 'name' | 'created' | 'updated' }
  ): Promise<Array<{ id: string; name: string; score: number }>>;
}

// Example external API client implementation - replace with your actual implementation
export class ExampleClient implements IExampleClient {
  constructor(private apiKey: string) {}

  async getItem(itemId: string): Promise<{ id: string; name: string; value: string }> {
    // Import from lib/ for better organization
    const { getItem } = await import('./example-client/lib/get-item.js');
    return getItem(this.apiKey, itemId);
  }

  async searchItems(
    query: string,
    options?: { limit?: number; offset?: number; sortBy?: 'name' | 'created' | 'updated' }
  ): Promise<Array<{ id: string; name: string; score: number }>> {
    // Import from lib/ for better organization
    const { searchItems } = await import('./example-client/lib/search-items.js');
    return searchItems(this.apiKey, query, options);
  }
}

export type ClientFactory = () => IExampleClient;

export function createMCPServer() {
  const server = new McpServer(
    {
      name: 'NAME-mcp-server',
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
