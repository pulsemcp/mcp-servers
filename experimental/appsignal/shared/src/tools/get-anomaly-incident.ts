import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The unique number of the anomaly incident to retrieve',
} as const;

export function getAnomalyIncidentTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetAnomalyIncidentSchema = z.object({
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
  });

  return server.registerTool(
    'get_anomaly_incident',
    {
      title: 'Get Anomaly Incident',
      description: `Retrieve detailed information about a specific anomaly incident in your AppSignal application. Anomaly incidents are automatically detected unusual patterns in your application's performance metrics, such as abnormal response times, memory usage spikes, or throughput variations. This tool provides comprehensive details about a single anomaly, including when it was detected, its severity, affected metrics, and current status.

Example response:
{
  "id": "anomaly-789",
  "type": "performance_anomaly",
  "metric": "response_time",
  "severity": "warning",
  "status": "OPEN",
  "detectedAt": "2024-01-15T10:30:00Z",
  "description": "Response time increased by 300% compared to baseline",
  "affectedEndpoint": "/api/users",
  "baselineValue": 150,
  "anomalyValue": 600,
  "unit": "ms"
}

Use cases:
- Investigating specific performance anomalies flagged by AppSignal
- Getting detailed metrics about unusual application behavior
- Understanding the scope and impact of detected anomalies
- Tracking the resolution status of performance issues`,
      inputSchema: GetAnomalyIncidentSchema,
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
        const incident = await client.getAnomalyIncident(incidentNumber);

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
              text: `Error fetching anomaly incident details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
