import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerState } from './state.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// Resources expose data that can be read by MCP clients.
// =============================================================================

export function registerResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'ssh://config',
          name: 'Server Configuration',
          description:
            'Current SSH server configuration and connection status. Useful for debugging and verifying setup.',
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
    if (uri === 'ssh://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 'ssh-mcp-server',
          version: '0.1.0',
          transport: 'stdio',
        },
        connection: {
          host: process.env.SSH_HOST || 'not configured',
          port: process.env.SSH_PORT || '22',
          username: process.env.SSH_USERNAME || 'not configured',
        },
        authentication: {
          sshAgent: process.env.SSH_AUTH_SOCK ? '***configured***' : 'not available',
          privateKey: process.env.SSH_PRIVATE_KEY_PATH ? '***configured***' : 'not configured',
        },
        environment: {
          ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
          SSH_TIMEOUT: process.env.SSH_TIMEOUT || '30000',
          SKIP_HEALTH_CHECKS: process.env.SKIP_HEALTH_CHECKS || 'false',
        },
        state: {
          selectedResourceId: state.selectedResourceId || 'none',
          isResourceLocked: state.isResourceLocked,
        },
        capabilities: {
          tools: true,
          resources: true,
        },
      };

      return {
        contents: [
          {
            uri: 'ssh://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
