import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { IClaudeCodeClient, ClaudeCodeClient } from './claude-code-client/claude-code-client.js';

export type ClientFactory = () => IClaudeCodeClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'claude-code-agent-mcp-server',
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
    // Create a single client instance that persists across tool calls
    let clientInstance: IClaudeCodeClient | null = null;

    const getClient = (): IClaudeCodeClient => {
      if (!clientInstance) {
        if (clientFactory) {
          clientInstance = clientFactory();
        } else {
          // Get configuration from environment variables
          const claudeCodePath = process.env.CLAUDE_CODE_PATH || 'claude';
          const trustedServersPath = process.env.TRUSTED_SERVERS_PATH;
          const serverConfigsPath = process.env.SERVER_CONFIGS_PATH;
          const serverSecretsPath = process.env.SERVER_SECRETS_PATH;
          const agentBaseDir = process.env.CLAUDE_AGENT_BASE_DIR || '/tmp/claude-agents';

          if (!trustedServersPath) {
            throw new Error('TRUSTED_SERVERS_PATH environment variable must be configured');
          }

          if (!serverConfigsPath) {
            throw new Error('SERVER_CONFIGS_PATH environment variable must be configured');
          }

          clientInstance = new ClaudeCodeClient(
            claudeCodePath,
            trustedServersPath,
            serverConfigsPath,
            agentBaseDir,
            serverSecretsPath
          );
        }
      }
      return clientInstance;
    };

    const registerResources = createRegisterResources(getClient);
    registerResources(server);

    const registerTools = createRegisterTools(getClient, process.env.SERVER_CONFIGS_PATH || '');
    registerTools(server);
  };

  return { server, registerHandlers };
}
