import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { SSHClient, SSHConfig, ISSHClient } from './ssh-client/ssh-client.js';

// Re-export SSH client types
export type {
  SSHConfig,
  ISSHClient,
  CommandResult,
  DirectoryEntry,
} from './ssh-client/ssh-client.js';
export { SSHClient } from './ssh-client/ssh-client.js';

export type ClientFactory = () => ISSHClient;

/**
 * Create SSH configuration from environment variables
 */
export function createSSHConfigFromEnv(): SSHConfig {
  const host = process.env.SSH_HOST;
  const username = process.env.SSH_USERNAME;

  if (!host || !username) {
    throw new Error('SSH_HOST and SSH_USERNAME environment variables must be configured');
  }

  // Parse and validate port
  let port = 22;
  if (process.env.SSH_PORT) {
    port = parseInt(process.env.SSH_PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `Invalid SSH_PORT: ${process.env.SSH_PORT}. Must be a number between 1 and 65535.`
      );
    }
  }

  // Parse and validate timeout
  let timeout = 30000;
  if (process.env.SSH_TIMEOUT) {
    timeout = parseInt(process.env.SSH_TIMEOUT, 10);
    if (isNaN(timeout) || timeout < 0) {
      throw new Error(
        `Invalid SSH_TIMEOUT: ${process.env.SSH_TIMEOUT}. Must be a non-negative number.`
      );
    }
  }

  return {
    host,
    port,
    username,
    privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
    passphrase: process.env.SSH_PASSPHRASE,
    agentSocket: process.env.SSH_AUTH_SOCK,
    timeout,
  };
}

export function createMCPServer() {
  const server = new Server(
    {
      name: 'ssh-mcp-server',
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
        const config = createSSHConfigFromEnv();
        return new SSHClient(config);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
