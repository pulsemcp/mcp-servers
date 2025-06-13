import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getExceptionIncidentSamplesTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  return server.tool(
    'get_exception_incident_samples',
    {
      incidentId: z.string().describe('The unique identifier of the exception incident'),
      limit: z
        .number()
        .int()
        .positive()
        .default(10)
        .describe('Maximum number of samples to return'),
    },
    async ({ incidentId, limit }) => {
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
        const samples = await client.getExceptionIncidentSamples(incidentId, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(samples, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching exception incident samples: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
