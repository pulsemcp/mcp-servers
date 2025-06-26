import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getAnomalyIncidentsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'get_anomaly_incidents',
    `Retrieve a list of anomaly incidents detected by AppSignal's automatic performance monitoring. Anomaly incidents represent unusual patterns in your application's behavior, such as response time spikes, memory usage anomalies, or throughput variations. This tool allows filtering by incident state and supports pagination for large result sets.

Example response:
{
  "incidents": [
    {
      "id": "anomaly-123",
      "type": "response_time_spike",
      "metric": "p95_response_time",
      "severity": "critical",
      "status": "OPEN",
      "detectedAt": "2024-01-15T14:30:00Z",
      "affectedEndpoint": "/api/checkout",
      "anomalyPercentage": 450
    },
    {
      "id": "anomaly-456",
      "type": "memory_anomaly",
      "metric": "heap_usage",
      "severity": "warning",
      "status": "WIP",
      "detectedAt": "2024-01-15T12:00:00Z",
      "affectedProcess": "web.1",
      "anomalyPercentage": 180
    }
  ],
  "totalCount": 25,
  "hasMore": true
}

State meanings:
- OPEN: New or unacknowledged anomalies requiring attention
- WIP: Work in progress - anomalies being investigated or addressed
- CLOSED: Resolved anomalies or false positives

Use cases:
- Monitoring active performance anomalies in your application
- Reviewing historical anomaly patterns
- Identifying trends in application performance issues
- Prioritizing performance optimization efforts`,
    {
      states: z
        .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
        .optional()
        .describe(
          'Filter incidents by state(s). OPEN = new/unacknowledged, WIP = work in progress, CLOSED = resolved. Defaults to ["OPEN"] if not provided'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of incidents to return. Useful for pagination. Defaults to 50'),
      offset: z
        .number()
        .optional()
        .describe('Number of incidents to skip for pagination. Defaults to 0'),
    },
    async (args) => {
      // Handle all parameter scenarios: {}, undefined, or missing entirely
      const { states, limit, offset } = args || {};
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
        // Handle undefined parameters properly to trigger default values
        const actualStates = states ?? ['OPEN'];
        const actualLimit = limit ?? 50;
        const actualOffset = offset ?? 0;

        const result = await client.getAnomalyIncidents(actualStates, actualLimit, actualOffset);

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
              text: `Error fetching anomaly incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
