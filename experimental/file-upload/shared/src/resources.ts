import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// The remote-filesystem server is stateless and doesn't maintain resources.
// This file provides the basic resource handlers but returns an empty list.
// =============================================================================

export function registerResources(server: Server) {
  // List available resources (none for this server)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'remote-filesystem://config',
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

    if (uri === 'remote-filesystem://config') {
      const config = {
        server: {
          name: 'remote-filesystem-mcp-server',
          version: '0.1.0',
          transport: 'stdio',
        },
        environment: {
          GCS_BUCKET: process.env.GCS_BUCKET ? '***configured***' : 'not set',
          GCS_PROJECT_ID: process.env.GCS_PROJECT_ID ? '***configured***' : 'not set',
          GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? '***configured***'
            : 'not set',
          GCS_CLIENT_EMAIL: process.env.GCS_CLIENT_EMAIL ? '***configured***' : 'not set',
          GCS_PRIVATE_KEY: process.env.GCS_PRIVATE_KEY ? '***configured***' : 'not set',
          GCS_ROOT_PATH: process.env.GCS_ROOT_PATH || 'not set',
          GCS_MAKE_PUBLIC: process.env.GCS_MAKE_PUBLIC || 'false (default)',
          ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
        },
        capabilities: {
          tools: ['upload', 'download', 'list_files', 'modify', 'delete_file'],
          resources: true,
          toolGroups: ['readonly', 'readwrite'],
        },
      };

      return {
        contents: [
          {
            uri: 'remote-filesystem://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
