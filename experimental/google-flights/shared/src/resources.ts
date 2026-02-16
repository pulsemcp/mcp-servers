import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllToolNames } from './tools.js';

export function registerResources(server: Server) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'google-flights://config',
          name: 'Server Configuration',
          description: 'Current server configuration and available tools.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'google-flights://config') {
      const config = {
        server: {
          name: 'google-flights-mcp-server',
          transport: 'stdio',
        },
        availableTools: getAllToolNames(),
        notes: [
          'No API key required — uses public Google Flights data.',
          'Rate limiting is applied automatically (1.5s between requests).',
          'Prices may vary based on currency and region.',
        ],
      };

      return {
        contents: [
          {
            uri: 'google-flights://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
