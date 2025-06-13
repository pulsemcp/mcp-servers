import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getAppsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    "get_apps",
    {},
    async () => {
      // TODO: Implement actual AppSignal API call to fetch available app IDs
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              apps: [
                { id: "app-1", name: "Production App" },
                { id: "app-2", name: "Staging App" },
                { id: "app-3", name: "Development App" }
              ]
            }, null, 2),
          },
        ],
      };
    }
  );
}