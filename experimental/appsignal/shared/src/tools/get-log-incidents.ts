import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getLogIncidentsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'get_log_incidents',
    `Retrieve a list of log incidents from your AppSignal application. Log incidents are automatically detected patterns in your application logs that may indicate issues, such as repeated errors, warnings, or critical events. This tool provides an overview of all log patterns requiring attention, with filtering and pagination support.

Example response:
{
  "incidents": [
    {
      "id": "log-789",
      "pattern": "Redis connection lost",
      "severity": "error",
      "status": "OPEN",
      "firstOccurredAt": "2024-01-15T08:00:00Z",
      "lastOccurredAt": "2024-01-15T16:45:00Z",
      "occurrenceCount": 156,
      "logLevel": "ERROR",
      "affectedServices": ["cache-worker"]
    },
    {
      "id": "log-456",
      "pattern": "Memory usage above 90%",
      "severity": "warning",
      "status": "WIP",
      "firstOccurredAt": "2024-01-14T10:00:00Z",
      "lastOccurredAt": "2024-01-15T15:30:00Z",
      "occurrenceCount": 45,
      "logLevel": "WARN",
      "affectedServices": ["web", "api"]
    }
  ],
  "totalCount": 23,
  "hasMore": true
}

State meanings:
- OPEN: New or unacknowledged log patterns requiring attention
- WIP: Log incidents being investigated or addressed
- CLOSED: Resolved issues or patterns marked as handled

Use cases:
- Getting an overview of all concerning log patterns
- Identifying recurring issues in application logs
- Prioritizing which log patterns to investigate
- Tracking the status of log-based issues
- Monitoring for new or escalating log patterns`,
    {
      states: z
        .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
        .optional()
        .describe(
          'Filter incidents by state(s). OPEN = new patterns, WIP = being investigated, CLOSED = resolved. Defaults to ["OPEN"] if not provided'
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
