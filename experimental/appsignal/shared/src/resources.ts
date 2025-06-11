import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSelectedAppId } from './state.js';

export function registerResources(server: McpServer) {
  server.resource(
    "config",
    "appsignal://config",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({
            apiKey: process.env.APPSIGNAL_API_KEY ? "***configured***" : "not configured",
            appId: process.env.APPSIGNAL_APP_ID || "not configured",
            selectedAppId: getSelectedAppId() || "none",
          }, null, 2),
        },
      ],
    })
  );
}