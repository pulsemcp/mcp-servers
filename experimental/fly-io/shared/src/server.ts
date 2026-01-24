import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  createRegisterTools,
  type RegisterToolsOptions,
  type DockerClientFactory,
} from './tools.js';
import { IFlyIOClient, FlyIOClient } from './fly-io-client/fly-io-client.js';
import { DockerCLIClient } from './docker-client/docker-cli-client.js';

// Re-export the client interface and implementation
export { IFlyIOClient, FlyIOClient };

export type ClientFactory = () => IFlyIOClient;

export interface CreateMCPServerOptions {
  version: string;
}

export interface RegisterHandlersOptions {
  clientFactory?: ClientFactory;
  dockerClientFactory?: DockerClientFactory;
  dockerDisabled?: boolean;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'fly-io-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (
    server: Server,
    handlerOptions?: ClientFactory | RegisterHandlersOptions
  ) => {
    // Handle both old signature (ClientFactory) and new signature (RegisterHandlersOptions)
    const opts: RegisterHandlersOptions =
      typeof handlerOptions === 'function'
        ? { clientFactory: handlerOptions }
        : handlerOptions || {};

    // Use provided factory or create default client
    const factory =
      opts.clientFactory ||
      (() => {
        const apiToken = process.env.FLY_IO_API_TOKEN;

        if (!apiToken) {
          throw new Error('FLY_IO_API_TOKEN environment variable must be configured');
        }

        return new FlyIOClient(apiToken);
      });

    // Use provided Docker factory or create default if not disabled
    const dockerFactory =
      opts.dockerClientFactory ||
      (!opts.dockerDisabled
        ? () => {
            const apiToken = process.env.FLY_IO_API_TOKEN;

            if (!apiToken) {
              throw new Error('FLY_IO_API_TOKEN environment variable must be configured');
            }

            return new DockerCLIClient(apiToken);
          }
        : undefined);

    const registerToolsOptions: RegisterToolsOptions = {
      dockerClientFactory: dockerFactory,
      dockerDisabled: opts.dockerDisabled,
    };

    const registerTools = createRegisterTools(factory, registerToolsOptions);
    registerTools(server);
  };

  return { server, registerHandlers };
}
