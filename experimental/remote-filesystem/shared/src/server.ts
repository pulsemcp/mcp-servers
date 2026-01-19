import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { GCSClient, type IGCSClient } from './gcs-client/gcs-client.js';

export type ClientFactory = () => IGCSClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'remote-filesystem-mcp-server',
      version: options.version,
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
        const bucket = process.env.GCS_BUCKET;

        if (!bucket) {
          throw new Error('GCS_BUCKET environment variable must be configured');
        }

        return new GCSClient({
          bucket,
          projectId: process.env.GCS_PROJECT_ID,
          // Support both key file and inline credentials
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          clientEmail: process.env.GCS_CLIENT_EMAIL,
          privateKey: process.env.GCS_PRIVATE_KEY,
          // Root path constraint
          rootPath: process.env.GCS_ROOT_PATH,
          // Default public setting
          makePublic: process.env.GCS_MAKE_PUBLIC === 'true',
        });
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
