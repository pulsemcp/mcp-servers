import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  states:
    'Filter incidents by state(s). OPEN = new patterns, WIP = being investigated, CLOSED = resolved. Defaults to ["OPEN"] if not provided',
  limit: 'Maximum number of incidents to return for pagination. Defaults to 50',
  offset: 'Number of incidents to skip for pagination. Defaults to 0',
} as const;

export function getLogIncidentsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetLogIncidentsShape = {
    states: z
      .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
      .optional()
      .describe(PARAM_DESCRIPTIONS.states),
    limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
    offset: z.number().optional().describe(PARAM_DESCRIPTIONS.offset),
  };

  const GetLogIncidentsSchema = z.object(GetLogIncidentsShape);

  return server.registerTool(
    'get_log_incidents',
    {
      title: 'Get Log Incidents',
      description: `Retrieve a list of log incidents from your AppSignal application. Log incidents are automatically detected patterns in your application logs that may indicate issues, such as repeated errors, warnings, or critical events. This tool provides an overview of all log patterns requiring attention, with filtering and pagination support.

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
      inputSchema: GetLogIncidentsShape,
    },
    async (args) => {
      // Handle all parameter scenarios: {}, undefined, or missing entirely
      const { states, limit, offset } = GetLogIncidentsSchema.parse(args || {});
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
        const actualStates = states ?? ['OPEN'];
        const actualLimit = limit ?? 50;
        const actualOffset = offset ?? 0;

        const result = await client.getLogIncidents(actualStates, actualLimit, actualOffset);

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
