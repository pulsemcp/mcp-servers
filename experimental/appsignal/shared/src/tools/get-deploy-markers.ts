import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  timeframe:
    'Time range to search for deployment markers (default: R7D = last 7 days). Options: R1H, R4H, R8H, R12H, R24H, R48H, R7D, R30D',
  limit: 'Maximum number of deployment markers to return (default: 10)',
} as const;

export function getDeployMarkersTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetDeployMarkersShape = {
    timeframe: z
      .enum(['R1H', 'R4H', 'R8H', 'R12H', 'R24H', 'R48H', 'R7D', 'R30D'])
      .default('R7D')
      .describe(PARAM_DESCRIPTIONS.timeframe),
    limit: z.number().int().positive().default(10).describe(PARAM_DESCRIPTIONS.limit),
  };

  const GetDeployMarkersSchema = z.object(GetDeployMarkersShape);

  return {
    name: 'get_deploy_markers',
    description: `Retrieve recent deployment markers from AppSignal to correlate performance issues and incidents with code deployments. This tool is essential for understanding whether a spike in errors or performance degradation coincides with a recent deployment. Each marker includes revision information, deployment time, the user who deployed, and exception counts that occurred after the deployment.

Example response:
{
  "deployMarkers": [
    {
      "id": "marker-123",
      "revision": "abc123def456789",
      "shortRevision": "abc123d",
      "createdAt": "2024-01-15T16:45:32.123Z",
      "user": "deploy-bot",
      "exceptionCount": 15
    },
    {
      "id": "marker-124",
      "revision": "def456abc123789",
      "shortRevision": "def456a",
      "createdAt": "2024-01-15T14:30:15.789Z",
      "user": "jane.doe",
      "exceptionCount": 3
    }
  ]
}

Timeframe options explained:
- R1H: Last 1 hour
- R4H: Last 4 hours
- R8H: Last 8 hours
- R12H: Last 12 hours
- R24H: Last 24 hours (1 day)
- R48H: Last 48 hours (2 days)
- R7D: Last 7 days (default)
- R30D: Last 30 days

Use cases:
- Correlating error spikes with recent deployments
- Investigating whether performance degradation started after a deploy
- Identifying problematic releases by exception count
- Understanding deployment frequency and patterns
- Finding which commit introduced an issue`,
    inputSchema: GetDeployMarkersShape,
    handler: async (args: unknown) => {
      const { timeframe, limit } = GetDeployMarkersSchema.parse(args);
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
        const deployMarkers = await client.getDeployMarkers(timeframe, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ deployMarkers }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching deploy markers: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
