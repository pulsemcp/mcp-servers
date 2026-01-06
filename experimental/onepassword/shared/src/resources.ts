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
          uri: 'onepassword://config',
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
    if (uri === 'onepassword://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 'onepassword-mcp-server',
          version: '0.1.0',
          transport: 'stdio',
        },
        environment: {
          // Show which environment variables are configured (masked for security)
          OP_SERVICE_ACCOUNT_TOKEN: process.env.OP_SERVICE_ACCOUNT_TOKEN
            ? '***configured***'
            : 'not set',
          ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
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
            uri: 'onepassword://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
