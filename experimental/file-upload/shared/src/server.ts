import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { GCSClient, type IGCSClient } from './gcs-client/gcs-client.js';

export type ClientFactory = () => IGCSClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'file-upload-mcp-server',
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
        const bucket = process.env.GCS_BUCKET;

        if (!bucket) {
          throw new Error('GCS_BUCKET environment variable must be configured');
        }

        return new GCSClient({
          bucket,
          projectId: process.env.GCS_PROJECT_ID,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          basePath: process.env.GCS_BASE_PATH,
          makePublic: process.env.GCS_MAKE_PUBLIC !== 'false',
        });
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
