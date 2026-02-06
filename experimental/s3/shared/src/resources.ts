import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerState } from './state.js';
import { getAllToolNames } from './tools.js';

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
          uri: 's3://config',
          name: 'Server Configuration',
          description:
            'Current server configuration and status. Shows enabled tool groups and tools.',
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
    if (uri === 's3://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 's3-mcp-server',
          version: '0.0.0',
          transport: 'stdio',
        },
        environment: {
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '***configured***' : 'not set',
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '***configured***' : 'not set',
          AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
          AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL || 'not set (using AWS default)',
          S3_ENABLED_TOOLGROUPS: process.env.S3_ENABLED_TOOLGROUPS || 'all (default)',
          S3_ENABLED_TOOLS: process.env.S3_ENABLED_TOOLS || 'not set',
          S3_DISABLED_TOOLS: process.env.S3_DISABLED_TOOLS || 'not set',
          SKIP_HEALTH_CHECKS: process.env.SKIP_HEALTH_CHECKS || 'false',
        },
        availableTools: getAllToolNames(),
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
            uri: 's3://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
