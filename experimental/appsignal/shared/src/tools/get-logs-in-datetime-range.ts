import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';

export function getLogsInDatetimeRangeTool(server: McpServer) {
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

      // TODO: Implement actual AppSignal API call
      return {
        content: [
          {
            type: "text",
            text: `[STUB] Would fetch logs between ${start} and ${end} (limit: ${limit}) in app: ${appId}`,
          },
        ],
      };
    }
  );
}