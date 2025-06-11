import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';

export function getAlertDetailsTool(server: McpServer) {
  return server.tool(
    "get_alert_details",
    { alertId: z.string().describe("The unique identifier of the alert to retrieve") },
    async ({ alertId }) => {
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
            text: `[STUB] Would fetch alert details for alert ID: ${alertId} in app: ${appId}`,
          },
        ],
      };
    }
  );
}