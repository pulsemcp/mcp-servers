import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools, ToolFilterConfig } from './tools.js';
import { IDynamoDBClient, DynamoDBClientImpl } from './dynamodb-client/dynamodb-client.js';

// Re-export for convenience
export { IDynamoDBClient } from './dynamodb-client/dynamodb-client.js';

export type ClientFactory = () => IDynamoDBClient;

export interface CreateMCPServerOptions {
  version: string;
  toolFilterConfig?: ToolFilterConfig;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'dynamodb-mcp-server',
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
        // Get AWS configuration from environment variables
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const endpoint = process.env.DYNAMODB_ENDPOINT;

        if (!region) {
          throw new Error(
            'AWS_REGION or AWS_DEFAULT_REGION environment variable must be configured'
          );
        }

        return new DynamoDBClientImpl({
          region,
          accessKeyId,
          secretAccessKey,
          endpoint,
        });
      });

    registerResources(server, options.version);
    const registerTools = createRegisterTools(factory, options.toolFilterConfig);
    registerTools(server);
  };

  return { server, registerHandlers };
}
