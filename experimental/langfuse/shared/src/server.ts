import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { ILangfuseClient, LangfuseClient } from './langfuse-client/langfuse-client.js';

export type ClientFactory = () => ILangfuseClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'langfuse-mcp-server',
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
    const factory =
      clientFactory ||
      (() => {
        const secretKey = process.env.LANGFUSE_SECRET_KEY;
        const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
        const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

        if (!secretKey || !publicKey) {
          throw new Error(
            'LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY environment variables must be configured'
          );
        }

        return new LangfuseClient(secretKey, publicKey, baseUrl);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
