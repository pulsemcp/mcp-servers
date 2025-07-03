import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The number of the performance incident to get the sample timeline for',
} as const;

export function getPerformanceIncidentSampleTimelineTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetPerformanceIncidentSampleTimelineSchema = z.object({
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
  });

  return server.registerTool(
    'get_performance_incident_sample_timeline',
    {
      title: 'Get Performance Incident Sample Timeline',
      description: `Retrieve the detailed timeline for a performance incident sample from AppSignal. The timeline shows a hierarchical breakdown of all operations performed during a request, including database queries, view rendering, external API calls, and custom instrumentation. This is essential for identifying the exact bottlenecks in slow requests.

Example response:
{
  "sampleId": "sample-789",
  "timeline": [
    {
      "name": "process_action.action_controller",
      "action": "UsersController#show",
      "digest": "abc123",
      "group": "action_controller",
      "level": 0,
      "duration": 1523.4,
      "childDuration": 1450.2,
      "allocationCount": 15000,
      "childAllocationCount": 14500,
      "count": 1,
      "time": 0,
      "end": 1523.4,
      "wrapping": false,
      "payload": {
        "name": "UsersController#show",
        "body": "Processing by UsersController#show as HTML"
      }
    },
    {
      "name": "sql.active_record",
      "action": "User Load",
      "digest": "def456",
      "group": "active_record",
      "level": 1,
      "duration": 234.5,
      "childDuration": 0,
      "allocationCount": 500,
      "childAllocationCount": 0,
      "count": 1,
      "time": 45.2,
      "end": 279.7,
      "wrapping": false,
      "payload": {
        "name": "User Load",
        "body": "SELECT users.* FROM users WHERE users.id = 42 LIMIT 1"
      }
    },
    {
      "name": "sql.active_record",
      "action": "Post Load",
      "digest": "ghi789",
      "group": "active_record",
      "level": 1,
      "duration": 856.3,
      "childDuration": 0,
      "allocationCount": 8000,
      "childAllocationCount": 0,
      "count": 25,
      "time": 280.0,
      "end": 1136.3,
      "wrapping": false,
      "payload": {
        "name": "Post Load",
        "body": "SELECT posts.* FROM posts WHERE posts.user_id = 42"
      }
    }
  ]
}

Field meanings:
- level: Nesting level in the timeline (0 = top level)
- duration: Total time for this operation in milliseconds
- childDuration: Time spent in child operations
- allocationCount: Number of Ruby object allocations
- childAllocationCount: Allocations in child operations
- count: Number of times this operation was called (useful for detecting N+1)
- time: Start time relative to request start
- end: End time relative to request start
- group: Category of operation (active_record, action_controller, net_http, etc.)
- payload: Additional details about the operation

Use cases:
- Identifying the slowest operations in a request
- Detecting N+1 queries (operations with high count values)
- Understanding the call hierarchy and timing breakdown
- Finding unexpected database queries or external API calls
- Analyzing memory allocation patterns`,
      inputSchema: {
        type: 'object',
        properties: {
          incidentNumber: {
            type: 'string',
            description: PARAM_DESCRIPTIONS.incidentNumber,
          },
        },
        required: ['incidentNumber'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    async (args: unknown) => {
      const { incidentNumber } = GetPerformanceIncidentSampleTimelineSchema.parse(args);
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
        const timeline = await client.getPerformanceIncidentSampleTimeline(incidentNumber);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(timeline, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching performance incident sample timeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
