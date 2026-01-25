import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools, type RegisterToolsOptions } from './tools.js';
import {
  PulseSubregistryClient,
  type ClientFactory,
  type IPulseSubregistryClient,
} from './client.js';

export interface CreateMCPServerOptions {
  version: string;
  showAdminTools?: boolean;
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
    // Use provided factory or create default singleton client from environment
    let clientInstance: IPulseSubregistryClient | null = null;
    const factory =
      clientFactory ||
      (() => {
        if (!clientInstance) {
          const apiKey = process.env.PULSEMCP_SUBREGISTRY_API_KEY;

          if (!apiKey) {
            throw new Error('PULSEMCP_SUBREGISTRY_API_KEY environment variable is required');
          }

          clientInstance = new PulseSubregistryClient({
            apiKey,
            tenantId: process.env.PULSEMCP_SUBREGISTRY_TENANT_ID,
          });
        }
        return clientInstance;
      });

    const toolsOptions: RegisterToolsOptions = {
      showAdminTools: options.showAdminTools,
    };

    const registerTools = createRegisterTools(factory, toolsOptions);
    registerTools(server);
  };

  return { server, registerHandlers };
}

// Re-export client types for integration testing
export type { IPulseSubregistryClient, ClientFactory };
export { PulseSubregistryClient };
