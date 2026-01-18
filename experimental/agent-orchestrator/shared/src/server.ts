import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import {
  AgentOrchestratorClient,
  type IAgentOrchestratorClient,
} from './orchestrator-client/orchestrator-client.js';

// Re-export the client interface for use in tools
export type { IAgentOrchestratorClient } from './orchestrator-client/orchestrator-client.js';

export type ClientFactory = () => IAgentOrchestratorClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'agent-orchestrator-mcp-server',
      version: '0.2.0',
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
        const baseUrl = process.env.AGENT_ORCHESTRATOR_BASE_URL;
        const apiKey = process.env.AGENT_ORCHESTRATOR_API_KEY;

        if (!baseUrl) {
          throw new Error('AGENT_ORCHESTRATOR_BASE_URL environment variable must be configured');
        }

        if (!apiKey) {
          throw new Error('AGENT_ORCHESTRATOR_API_KEY environment variable must be configured');
        }

        return new AgentOrchestratorClient(baseUrl, apiKey);
      });

    const registerResources = createRegisterResources(factory);
    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
