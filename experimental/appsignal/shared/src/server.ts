import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { IAppsignalClient, AppsignalClient } from './appsignal-client/appsignal-client.js';
import { getEffectiveAppId } from './state.js';

export type ClientFactory = () => IAppsignalClient;

export function createMCPServer() {
  const server = new McpServer(
    {
      name: 'mcp-server-appsignal',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: McpServer, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const apiKey = process.env.APPSIGNAL_API_KEY;

        if (!apiKey) {
          throw new Error('APPSIGNAL_API_KEY environment variable must be configured');
        }

        // Use effective app ID (env var takes precedence)
        const appId = getEffectiveAppId() || '';

        return new AppsignalClient(apiKey, appId);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
