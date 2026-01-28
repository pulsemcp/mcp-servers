import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  namespace:
    'Optional namespace filter to limit results. Common values: "web" for web requests, "background" for background jobs. If not provided, returns incidents from all namespaces',
  incidentLimit:
    'Maximum number of performance incidents to return. Each incident represents a unique slow endpoint or action. Defaults to 5',
  samplesPerIncident:
    'Number of sample requests to include per incident. Samples provide detailed timing breakdowns and request parameters. Defaults to 3',
} as const;

export function getSlowRequestsTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetSlowRequestsShape = {
    namespace: z.string().nullable().optional().describe(PARAM_DESCRIPTIONS.namespace),
    incidentLimit: z.number().optional().describe(PARAM_DESCRIPTIONS.incidentLimit),
    samplesPerIncident: z.number().optional().describe(PARAM_DESCRIPTIONS.samplesPerIncident),
  };

  const GetSlowRequestsSchema = z.object(GetSlowRequestsShape);

  return {
    name: 'get_slow_requests',
    description: `Convenience tool that retrieves the slowest recent requests from your AppSignal application in a single call. This combines performance incident data with detailed sample information to quickly identify and analyze performance bottlenecks.

For each slow incident, you get:
- Incident overview: action names, mean duration, occurrence count, namespace
- N+1 query detection
- Sample requests with:
  - Full request path and parameters
  - Total duration and queue time
  - Timing breakdown by component (active_record, action_view, etc.)
  - Request metadata (controller, method, path, format)

This is faster than calling get_perf_incidents followed by get_perf_incident_sample for each incident, making it ideal for quick performance triage.

Example response:
{
  "incidents": [
    {
      "number": 42,
      "actionNames": ["UsersController#show"],
      "mean": 1234.5,
      "count": 523,
      "hasNPlusOne": true,
      "namespace": "web",
      "samples": [
        {
          "id": "sample-123",
          "time": "2024-01-15T14:30:00Z",
          "action": "UsersController#show",
          "duration": 2500,
          "queueDuration": 10,
          "hasNPlusOne": true,
          "params": "{\\"id\\":\\"456\\"}",
          "overview": [
            {"key": "method", "value": "GET"},
            {"key": "path", "value": "/users/456"},
            {"key": "format", "value": "html"}
          ],
          "groupDurations": [
            {"key": "active_record", "value": 1800},
            {"key": "action_view", "value": 650},
            {"key": "action_controller", "value": 50}
          ]
        }
      ]
    }
  ]
}

Use cases:
- Quick performance triage: "What are my slowest endpoints right now?"
- Debugging performance issues with full request context
- Identifying N+1 queries with actual query details
- Understanding where time is spent (database vs views vs controller)
- Comparing performance across different namespaces (web vs background)

Common workflows:
1. Run get_slow_requests() to see top performance issues
2. Review groupDurations to identify bottlenecks (database, rendering, etc.)
3. Check hasNPlusOne flag and review active_record timing
4. Use params and overview to understand request patterns
5. If needed, get more details with get_perf_incident or get_perf_incident_sample_timeline`,
    inputSchema: GetSlowRequestsShape,
    handler: async (args: unknown) => {
      const { namespace, incidentLimit, samplesPerIncident } = GetSlowRequestsSchema.parse(
        args || {}
      );
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
        const actualNamespace = namespace ?? null;
        const actualIncidentLimit = incidentLimit ?? 5;
        const actualSamplesPerIncident = samplesPerIncident ?? 3;

        const result = await client.getSlowRequests(
          actualNamespace,
          actualIncidentLimit,
          actualSamplesPerIncident
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching slow requests: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
