import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getPerformanceIncidentsTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  return server.tool(
    'get_performance_incidents',
    `Retrieve a list of performance incidents from your AppSignal application. Performance incidents identify slow endpoints, database queries, and other performance bottlenecks in your application. This tool provides an overview of all performance issues affecting your application, with filtering and pagination capabilities.

Example response:
{
  "incidents": [
    {
      "id": "perf-123",
      "number": "42",
      "state": "open",
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
      "state": "wip",
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
- open: Active performance issues requiring attention
- wip: Performance issues being investigated or optimized
- closed: Resolved performance issues

Use cases:
- Getting an overview of all performance bottlenecks
- Prioritizing which performance issues to fix based on impact
- Monitoring performance trends and patterns
- Tracking the status of performance optimization efforts
- Identifying N+1 queries and slow database operations`,
    {
      states: z
        .array(z.enum(['open', 'closed', 'wip']))
        .optional()
        .describe(
          'Filter incidents by state(s). open = active issues, wip = being investigated, closed = resolved. Defaults to ["open"] if not provided'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of incidents to return for pagination. Defaults to 50'),
      offset: z
        .number()
        .optional()
        .describe('Number of incidents to skip for pagination. Defaults to 0'),
    },
    async (args) => {
      // Handle all parameter scenarios: {}, undefined, or missing entirely
      const { states, limit, offset } = args || {};
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
        // Handle undefined parameters properly to trigger default values
        const actualStates = states ?? ['open'];
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
              text: `Error fetching performance incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
