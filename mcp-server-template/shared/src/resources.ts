import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function registerResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "example://resource",
          name: "Example Resource",
          description: "An example resource implementation",
          mimeType: "text/plain",
        },
      ],
    };
  });

  // Read resource contents
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "example://resource") {
      return {
        contents: [
          {
            uri: "example://resource",
            mimeType: "text/plain",
            text: "This is an example resource content.",
          },
        ],
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}