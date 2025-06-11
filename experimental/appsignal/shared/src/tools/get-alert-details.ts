import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getAlertDetailsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
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

      try {
        const client = clientFactory();
        const alert = await client.getAlertDetails(alertId);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(alert, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching alert details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}