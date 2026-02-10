import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerState } from './state.js';
import { getAllToolNames } from './tools.js';

export function registerResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'gcs://config',
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

    if (uri === 'gcs://config') {
      const state = getServerState();

      const config = {
        server: {
          name: 'gcs-mcp-server',
          version: '0.0.0',
          transport: 'stdio',
        },
        environment: {
          GCS_PROJECT_ID: process.env.GCS_PROJECT_ID || 'not set',
          GCS_SERVICE_ACCOUNT_KEY_FILE: process.env.GCS_SERVICE_ACCOUNT_KEY_FILE
            ? '***configured***'
            : 'not set',
          GCS_SERVICE_ACCOUNT_KEY_JSON: process.env.GCS_SERVICE_ACCOUNT_KEY_JSON
            ? '***configured***'
            : 'not set',
          GCS_ENABLED_TOOLGROUPS: process.env.GCS_ENABLED_TOOLGROUPS || 'all (default)',
          GCS_ENABLED_TOOLS: process.env.GCS_ENABLED_TOOLS || 'not set',
          GCS_DISABLED_TOOLS: process.env.GCS_DISABLED_TOOLS || 'not set',
          GCS_BUCKET: process.env.GCS_BUCKET || 'not set',
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
            uri: 'gcs://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
