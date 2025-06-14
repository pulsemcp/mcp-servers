import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getLogIncidentsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'get_log_incidents',
    {
      states: z
        .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
        .optional()
        .describe('Filter incidents by state(s). Defaults to ["OPEN"] if not provided'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of incidents to return. Defaults to 50'),
      offset: z.number().optional().describe('Number of incidents to skip. Defaults to 0'),
    },
    async ({ states, limit, offset }) => {
      const appId = getSelectedAppId() || process.env.APPSIGNAL_APP_ID;
      if (!appId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No app ID selected. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const result = await client.getLogIncidents(states, limit, offset);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching log incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
