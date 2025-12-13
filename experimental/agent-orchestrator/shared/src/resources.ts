import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// Resources expose data that can be read by MCP clients.
// For agent-orchestrator, we expose a configuration resource for debugging.
// =============================================================================

export function registerResources(server: Server) {
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
          version: '0.1.0',
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
          write: 'Write operations (create, update, follow_up, pause, restart, archive, unarchive)',
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

    throw new Error(`Resource not found: ${uri}`);
  });
}
