import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import {
  PulseSubregistryClient,
  type ClientFactory,
  type IPulseSubregistryClient,
} from './client.js';

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: '@pulsemcp/pulse-subregistry',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client from environment
    const factory =
      clientFactory ||
      (() => {
        const apiKey = process.env.PULSEMCP_API_KEY;

        if (!apiKey) {
          throw new Error('PULSEMCP_API_KEY environment variable is required');
        }

        return new PulseSubregistryClient({
          apiKey,
          tenantId: process.env.PULSEMCP_TENANT_ID,
        });
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}

// Re-export client types for integration testing
export type { IPulseSubregistryClient, ClientFactory };
export { PulseSubregistryClient };
