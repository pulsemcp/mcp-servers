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
          uri: 'flightaware://config',
          name: 'Server Configuration',
          description: 'Current server configuration and available tools.',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'flightaware://config') {
      const config = {
        server: {
          name: 'flightaware-mcp-server',
          transport: 'stdio',
        },
        availableTools: getAllToolNames(),
        notes: [
          'Requires a FlightAware AeroAPI key (set AEROAPI_API_KEY environment variable).',
          'Uses FlightAware AeroAPI v4 (https://aeroapi.flightaware.com/aeroapi).',
          'AeroAPI usage is billed per query; see https://www.flightaware.com/aeroapi/portal/.',
          'This server is read-only: to watch a flight or airport for changes, poll the relevant tool on an interval and diff the results.',
        ],
      };

      return {
        contents: [
          {
            uri: 'flightaware://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
