import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  states:
    'Filter incidents by state(s). OPEN = active issues, WIP = being investigated, CLOSED = resolved. Defaults to ["OPEN"] if not provided',
  limit: 'Maximum number of incidents to return for pagination. Defaults to 50',
  offset: 'Number of incidents to skip for pagination. Defaults to 0',
} as const;

export function getPerformanceIncidentsTool(
  _server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetPerformanceIncidentsShape = {
    states: z
      .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
      .optional()
      .describe(PARAM_DESCRIPTIONS.states),
    limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
    offset: z.number().optional().describe(PARAM_DESCRIPTIONS.offset),
  };

  const GetPerformanceIncidentsSchema = z.object(GetPerformanceIncidentsShape);

  return {
    name: 'get_performance_incidents',
    description: `Retrieve a list of performance incidents from your AppSignal application. Performance incidents identify slow endpoints, database queries, and other performance bottlenecks in your application. This tool provides an overview of all performance issues affecting your application, with filtering and pagination capabilities.

Example response:
{
  "incidents": [
    {
      "id": "perf-123",
      "number": "42",
      "state": "OPEN",
      "severity": "high",
      "actionNames": ["UsersController#show", "UsersController#index"],
      "namespace": "web",
      "mean": 1234.5,
      "count": 523,
      "scopedCount": 450,
      "totalDuration": 645123.5,
      "description": "Slow database query in User.find",
      "digests": ["abc123", "def456"],
      "hasNPlusOne": true,
      "hasSamplesInRetention": true,
      "createdAt": "2024-01-10T10:00:00Z",
      "lastOccurredAt": "2024-01-15T14:30:00Z",
      "lastSampleOccurredAt": "2024-01-15T14:29:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    },
    {
      "id": "perf-456",
      "number": "43",
      "state": "WIP",
      "severity": "medium",
      "actionNames": ["ProductsController#index"],
      "namespace": "web",
      "mean": 856.3,
      "count": 89,
      "scopedCount": 75,
      "totalDuration": 76211.7,
      "description": "Slow external API call",
      "digests": ["ghi789"],
      "hasNPlusOne": false,
      "hasSamplesInRetention": true,
      "createdAt": "2024-01-14T09:00:00Z",
      "lastOccurredAt": "2024-01-15T15:00:00Z",
      "lastSampleOccurredAt": "2024-01-15T14:55:00Z",
      "updatedAt": "2024-01-15T15:00:00Z"
    }
  ],
  "total": 47,
  "hasMore": true
}

State meanings:
- OPEN: Active performance issues requiring attention
- WIP: Performance issues being investigated or optimized
- CLOSED: Resolved performance issues

Use cases:
- Getting an overview of all performance bottlenecks
- Prioritizing which performance issues to fix based on impact
- Monitoring performance trends and patterns
- Tracking the status of performance optimization efforts
- Identifying N+1 queries and slow database operations`,
    inputSchema: GetPerformanceIncidentsShape,
    handler: async (args: unknown) => {
      // Handle all parameter scenarios: {}, undefined, or missing entirely
      const { states, limit, offset } = GetPerformanceIncidentsSchema.parse(args || {});
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
        // Handle undefined parameters properly to trigger default values
        const actualStates = states ?? ['OPEN'];
        const actualLimit = limit ?? 50;
        const actualOffset = offset ?? 0;

        const result = await client.getPerformanceIncidents(
          actualStates,
          actualLimit,
          actualOffset
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
              text: `Error fetching performance incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
