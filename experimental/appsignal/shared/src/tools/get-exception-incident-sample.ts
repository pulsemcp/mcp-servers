import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The unique number of the exception incident',
  offset: 'Sample index to retrieve (0 for most recent, 1 for second most recent, etc.)',
} as const;

export function getExceptionIncidentSampleTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetExceptionIncidentSampleSchema = z.object({
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
    offset: z.number().int().min(0).default(0).describe(PARAM_DESCRIPTIONS.offset),
  });

  return server.registerTool(
    'get_exception_incident_sample',
    {
      title: 'Get Exception Incident Sample',
      description: `Retrieve sample data for a specific occurrence of an exception incident. While exception incidents group similar errors together, this tool provides context of a single occurrence, including request parameters, session data, and environment details. Note: Due to API limitations, the actual exception message and backtrace are not available.

💡 Recommended follow-up: After retrieving the sample, use the search_logs tool with:
- Time range around the sample's timestamp (-10 seconds through +3 seconds)
- Query terms from the action/namespace/params to find related log entries
- This can help reconstruct what happened since backtrace data is unavailable

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
      inputSchema: {
        type: 'object',
        properties: {
          incidentNumber: {
            type: 'string',
            description: PARAM_DESCRIPTIONS.incidentNumber,
          },
          offset: {
            type: 'number',
            description: PARAM_DESCRIPTIONS.offset,
          },
        },
        required: ['incidentNumber'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    async (args: unknown) => {
      const { incidentNumber, offset } = GetExceptionIncidentSampleSchema.parse(args);
      const appId = getEffectiveAppId();
      if (!appId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: No app ID configured. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const sample = await client.getExceptionIncidentSample(incidentNumber, offset);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(sample, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching exception incident sample: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
