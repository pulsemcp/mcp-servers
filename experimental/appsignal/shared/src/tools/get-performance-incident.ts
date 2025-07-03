import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The number of the performance incident to retrieve',
} as const;

export function getPerformanceIncidentTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetPerformanceIncidentSchema = z.object({
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
  });

  return server.registerTool(
    'get_performance_incident',
    {
      title: 'Get Performance Incident',
      description: `Retrieve details about a specific performance incident from AppSignal. Performance incidents represent specific performance bottlenecks like slow endpoints, database queries, or external API calls. This tool provides detailed information about a single performance issue.

Example response:
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
}

Field meanings:
- mean: Average duration in milliseconds
- count: Total number of occurrences
- scopedCount: Number of occurrences within the selected time range
- totalDuration: Combined duration of all occurrences in milliseconds
- hasNPlusOne: Whether this incident contains N+1 query patterns
- hasSamplesInRetention: Whether detailed samples are available for analysis
- digests: Unique identifiers for grouping similar incidents

Use cases:
- Getting detailed information about a specific performance issue
- Understanding the impact and frequency of a performance bottleneck
- Checking if an incident has N+1 query problems
- Determining if samples are available for deeper analysis`,
      inputSchema: GetPerformanceIncidentSchema,
    },
    async ({ incidentNumber }) => {
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
        const incident = await client.getPerformanceIncident(incidentNumber);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching performance incident: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
