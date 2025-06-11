import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function getAppIdsTool(server: McpServer) {
  return server.tool(
    "get_app_ids",
    {},
    async () => {
      // TODO: Implement actual AppSignal API call to fetch available app IDs
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              appIds: [
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