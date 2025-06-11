import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function registerResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "appsignal://config",
          name: "AppSignal Configuration",
          description: "Current AppSignal configuration settings",
          mimeType: "application/json",
        },
      ],
    };
  });

  // Handle resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "appsignal://config") {
      return {
        contents: [
          {
            uri: "appsignal://config",
            mimeType: "application/json",
            text: JSON.stringify({
              apiKey: process.env.APPSIGNAL_API_KEY ? "***configured***" : "not configured",
              appId: process.env.APPSIGNAL_APP_ID || "not configured",
              environment: process.env.APPSIGNAL_ENVIRONMENT || "production",
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });
}