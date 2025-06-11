import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';

export function searchLogsTool(server: McpServer) {
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

      // TODO: Implement actual AppSignal API call
      return {
        content: [
          {
            type: "text",
            text: `[STUB] Would search logs with query: "${query}" (limit: ${limit}, offset: ${offset}) in app: ${appId}`,
          },
        ],
      };
    }
  );
}