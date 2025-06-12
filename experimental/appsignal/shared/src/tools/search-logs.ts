import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function searchLogsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    "search_logs",
    {
      query: z.string().describe("The search query to filter logs"),
      limit: z.number().int().positive().default(50).describe("Maximum number of results to return"),
      offset: z.number().int().min(0).default(0).describe("Number of results to skip"),
    },
    async ({ query, limit, offset }) => {
      const appId = getSelectedAppId() || process.env.APPSIGNAL_APP_ID;
      if (!appId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No app ID selected. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.",
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const logs = await client.searchLogs(query, limit, offset);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}