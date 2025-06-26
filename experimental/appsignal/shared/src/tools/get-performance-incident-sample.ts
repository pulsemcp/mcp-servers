import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getPerformanceIncidentSampleTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  return server.tool(
    'get_performance_incident_sample',
    `Retrieve a sample transaction for a specific performance incident from AppSignal. Samples provide detailed timing information about a specific slow request or operation, helping you understand exactly where time is being spent.

💡 Recommended follow-up: After retrieving the sample, use the search_logs tool with:
- Time range around the sample's timestamp (-10 seconds through +3 seconds)
- Query terms from the action/namespace/params to find related log entries
- Look for errors, warnings, or debug logs that might explain the performance issue

Example response:
{
  "id": "sample-789",
  "time": "2024-01-15T14:29:00Z",
  "action": "UsersController#show",
  "duration": 1523.4,
  "queueDuration": 45.2,
  "namespace": "web",
  "revision": "abc123def456",
  "version": "1.2.3",
  "originalId": "req-12345",
  "originallyRequested": true,
  "hasNPlusOne": true,
  "timelineTruncatedEvents": 0,
  "createdAt": "2024-01-15T14:29:05Z",
  "customData": {
    "user_id": "12345",
    "organization": "acme-corp"
  },
  "params": {
    "id": "42",
    "include": "profile,settings"
  },
  "sessionData": {
    "user_agent": "Mozilla/5.0...",
    "ip": "192.168.1.1"
  }
}

Field meanings:
- duration: Total request duration in milliseconds
- queueDuration: Time spent waiting in queue before processing
- hasNPlusOne: Whether N+1 query patterns were detected in this sample
- timelineTruncatedEvents: Number of timeline events truncated due to size limits
- originallyRequested: Whether this was an actual user request (vs background job)
- customData: Custom application data attached to the request
- params: Request parameters
- sessionData: Session and request metadata

Use cases:
- Analyzing a specific slow request to understand bottlenecks
- Viewing request parameters and custom data for context
- Checking if N+1 queries occurred in this specific sample
- Understanding queue wait times vs actual processing time`,
    {
      incidentId: z.string().describe('The ID of the performance incident to get a sample for'),
    },
    async ({ incidentId }) => {
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
        const sample = await client.getPerformanceIncidentSample(incidentId);

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
              text: `Error fetching performance incident sample: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
