import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import {
  type IGCSClient,
  GoogleCloudStorageClient,
  type GCSClientConfig,
} from './gcs-client/gcs-client.js';

// Re-export GCS client types for use in tools
export type { IGCSClient, GCSClientConfig };
export { GoogleCloudStorageClient };

export type GCSClientFactory = () => IGCSClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'gcs-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: GCSClientFactory) => {
    // Use provided factory or create default client from environment variables
    const factory =
      clientFactory ||
      (() => {
        const projectId = process.env.GCS_PROJECT_ID;
        const keyFilePath = process.env.GCS_SERVICE_ACCOUNT_KEY_FILE;
        const keyFileContents = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;

        if (!projectId) {
          throw new Error('GCS_PROJECT_ID environment variable must be configured');
        }

        return new GoogleCloudStorageClient({
          projectId,
          keyFilePath,
          keyFileContents,
        });
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
