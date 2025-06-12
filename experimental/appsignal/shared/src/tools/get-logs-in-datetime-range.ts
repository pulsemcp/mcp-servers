import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getLogsInDatetimeRangeTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    "get_logs_in_datetime_range",
    {
      start: z.string().describe("ISO 8601 datetime for the start of the range"),
      end: z.string().describe("ISO 8601 datetime for the end of the range"),
      limit: z.number().int().positive().default(100).describe("Maximum number of logs to return"),
    },
    async ({ start, end, limit }) => {
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
        const logs = await client.getLogsInDatetimeRange(start, end, limit);
        
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
              text: `Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}