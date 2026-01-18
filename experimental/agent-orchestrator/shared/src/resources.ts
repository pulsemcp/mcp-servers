import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { IAgentOrchestratorClient } from './orchestrator-client/orchestrator-client.js';
import { getConfigsCache, setConfigsCache } from './cache/configs-cache.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// Resources expose data that can be read by MCP clients.
// For agent-orchestrator, we expose:
// - Server configuration for debugging
// - Static configs (MCP servers, agent roots, stop conditions) from the API
// =============================================================================

export type ClientFactory = () => IAgentOrchestratorClient;

/**
 * Creates a function to register all resources with the server.
 * @param clientFactory - Factory function that creates client instances
 * @returns Function that registers all resources with a server
 */
export function createRegisterResources(clientFactory: ClientFactory) {
  return (server: Server) => {
    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'agent-orchestrator://config',
            name: 'Server Configuration',
            description:
              'Current server configuration and status. Useful for debugging and verifying setup.',
            mimeType: 'application/json',
          },
          {
            uri: 'agent-orchestrator://configs/mcp-servers',
            name: 'Available MCP Servers',
            description: 'List of available MCP servers that can be used with start_session.',
            mimeType: 'application/json',
          },
          {
            uri: 'agent-orchestrator://configs/agent-roots',
            name: 'Agent Roots',
            description:
              'Preconfigured repository settings with default branch, MCP servers, and stop conditions.',
            mimeType: 'application/json',
          },
          {
            uri: 'agent-orchestrator://configs/stop-conditions',
            name: 'Stop Conditions',
            description: 'Available session completion criteria for use with start_session.',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource contents
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // =========================================================================
      // CONFIG RESOURCE - Server Status and Configuration
      // =========================================================================
      if (uri === 'agent-orchestrator://config') {
        const config = {
          server: {
            name: 'agent-orchestrator-mcp-server',
            version: '0.2.0',
            transport: 'stdio',
          },
          environment: {
            AGENT_ORCHESTRATOR_BASE_URL: process.env.AGENT_ORCHESTRATOR_BASE_URL
              ? '***configured***'
              : 'not set',
            AGENT_ORCHESTRATOR_API_KEY: process.env.AGENT_ORCHESTRATOR_API_KEY
              ? '***configured***'
              : 'not set',
            ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
            SKIP_HEALTH_CHECKS: process.env.SKIP_HEALTH_CHECKS || 'false',
          },
          capabilities: {
            tools: true,
            resources: true,
          },
          toolGroups: {
            readonly: 'Read-only operations (list, get, search)',
            write:
              'Write operations (create, update, follow_up, pause, restart, archive, unarchive)',
            admin: 'Administrative operations (delete)',
          },
        };

        return {
          contents: [
            {
              uri: 'agent-orchestrator://config',
              mimeType: 'application/json',
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }

      // =========================================================================
      // CONFIGS RESOURCES - Static configuration from API
      // =========================================================================
      if (uri.startsWith('agent-orchestrator://configs/')) {
        // Fetch configs (using cache if available)
        const configs = await fetchConfigs(clientFactory);

        if (uri === 'agent-orchestrator://configs/mcp-servers') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    mcp_servers: configs.mcp_servers,
                    _usage: 'Use the "name" field when specifying mcp_servers in start_session',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (uri === 'agent-orchestrator://configs/agent-roots') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    agent_roots: configs.agent_roots,
                    _usage:
                      'Use the "git_root" field when starting sessions. Default settings will be applied automatically.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (uri === 'agent-orchestrator://configs/stop-conditions') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    stop_conditions: configs.stop_conditions,
                    _usage: 'Use the "id" field when specifying stop_condition in start_session',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      throw new Error(`Resource not found: ${uri}`);
    });
  };
}

/**
 * Fetch configs from API, using cache if available.
 */
async function fetchConfigs(clientFactory: ClientFactory) {
  const cached = getConfigsCache();
  if (cached) {
    return cached;
  }

  const client = clientFactory();
  const configs = await client.getConfigs();
  setConfigsCache(configs);
  return configs;
}
