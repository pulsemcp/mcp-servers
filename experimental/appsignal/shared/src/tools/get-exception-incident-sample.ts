import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getExceptionIncidentSampleTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  return server.tool(
    'get_exception_incident_sample',
    `Retrieve sample data for a specific occurrence of an exception incident. While exception incidents group similar errors together, this tool provides context of a single occurrence, including request parameters, session data, and environment details. Note: Due to API limitations, the actual exception message and backtrace are not available.

Example response:
{
  "id": "sample-98765",
  "timestamp": "2024-01-15T14:32:15Z",
  "message": "Exception details not available due to AppSignal API limitation. The exception field cannot be queried without causing server errors.",
  "action": "UsersController#show",
  "namespace": "web",
  "revision": "a1b2c3d4",
  "version": "1.2.3",
  "duration": 125,
  "params": {
    "controller": "users",
    "action": "show",
    "id": "123"
  },
  "customData": {
    "user_id": 456,
    "feature_flag": "new_ui"
  },
  "sessionData": {
    "session_id": "abc123",
    "created_at": "2024-01-15T08:00:00Z"
  }
}

Use cases:
- Analyzing request parameters that triggered errors
- Understanding the context where errors occurred
- Investigating user-specific error conditions
- Tracking error occurrences across different app versions`,
    {
      incidentId: z.string().describe('The unique identifier of the exception incident'),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Sample index to retrieve (0 for most recent, 1 for second most recent, etc.)'),
    },
    async ({ incidentId, offset }) => {
      const appId = getEffectiveAppId();
      if (!appId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No app ID configured. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const sample = await client.getExceptionIncidentSample(incidentId, offset);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sample, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching exception incident sample: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
