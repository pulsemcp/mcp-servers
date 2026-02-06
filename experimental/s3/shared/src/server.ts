import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { type IS3Client, AwsS3Client, type S3ClientConfig } from './s3-client/s3-client.js';

// Re-export S3 client types for use in tools
export type { IS3Client, S3ClientConfig };
export { AwsS3Client };

export type S3ClientFactory = () => IS3Client;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 's3-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: S3ClientFactory) => {
    // Use provided factory or create default client from environment variables
    const factory =
      clientFactory ||
      (() => {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
        const endpoint = process.env.AWS_ENDPOINT_URL;

        if (!accessKeyId || !secretAccessKey) {
          throw new Error(
            'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be configured'
          );
        }

        return new AwsS3Client({
          accessKeyId,
          secretAccessKey,
          region,
          endpoint,
        });
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
