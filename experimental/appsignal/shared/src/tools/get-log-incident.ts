import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The unique number of the log incident to retrieve',
} as const;

export function getLogIncidentTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetLogIncidentShape = {
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
  };

  const GetLogIncidentSchema = z.object(GetLogIncidentShape);

  return {
    name: 'get_log_incident',
    description: `Retrieve detailed information about a specific log incident in your AppSignal application. Log incidents represent patterns in your application logs that indicate potential issues, such as repeated error messages, warning patterns, or critical system events. This tool provides comprehensive details about a single log incident including the log pattern, frequency, and context.

Example response:
{
  "id": "log-54321",
  "pattern": "Failed to connect to database",
  "severity": "error",
  "status": "OPEN",
  "firstOccurredAt": "2024-01-15T09:00:00Z",
  "lastOccurredAt": "2024-01-15T16:30:00Z",
  "occurrenceCount": 89,
  "logLevel": "ERROR",
  "source": "app.database.connection",
  "environment": "production",
  "sampleMessages": [
    {
      "timestamp": "2024-01-15T16:30:00Z",
      "message": "Failed to connect to database: Connection timeout after 30s",
      "metadata": {
        "host": "db-primary",
        "port": 5432,
        "retry_count": 3
      }
    }
  ],
  "affectedServices": ["api", "worker"]
}

Use cases:
- Investigating specific log patterns and their frequency
- Understanding the context of recurring log messages
- Tracking down intermittent issues captured in logs
- Analyzing the impact of log incidents on different services
- Monitoring the resolution status of identified log patterns`,
    inputSchema: GetLogIncidentShape,
    handler: async (args: unknown) => {
      const { incidentNumber } = GetLogIncidentSchema.parse(args);
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
        const incident = await client.getLogIncident(incidentNumber);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching log incident details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
