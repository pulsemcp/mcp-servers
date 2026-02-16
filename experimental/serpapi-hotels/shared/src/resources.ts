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
          uri: 'serpapi-hotels://config',
          name: 'Server Configuration',
          description: 'Current server configuration and available tools.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'serpapi-hotels://config') {
      const config = {
        server: {
          name: 'serpapi-hotels-mcp-server',
          transport: 'stdio',
        },
        availableTools: getAllToolNames(),
        notes: [
          'Requires a SerpAPI API key (set SERPAPI_API_KEY environment variable).',
          'Uses the Google Hotels engine on SerpAPI.',
          'Cached searches on SerpAPI are free and do not count toward monthly quota.',
        ],
      };

      return {
        contents: [
          {
            uri: 'serpapi-hotels://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
