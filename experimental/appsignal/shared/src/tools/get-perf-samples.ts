import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  actionName:
    'The controller action name to get performance samples for (e.g., "UsersController#show")',
  limit: 'Maximum number of samples to return. Defaults to 10',
} as const;

export function getPerfSamplesTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetPerfSamplesShape = {
    actionName: z.string().describe(PARAM_DESCRIPTIONS.actionName),
    limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
  };

  const GetPerfSamplesSchema = z.object(GetPerfSamplesShape);

  return {
    name: 'get_perf_samples',
    description: `Retrieve multiple recent performance samples for a specific controller action from AppSignal. Each sample represents a detailed snapshot of a slow request or operation, including timing breakdowns by component (database, view rendering, etc.), request parameters, and the full execution path.

This tool provides broader context by showing multiple examples of the same performance issue, helping you identify patterns and understand if the problem is consistent or varies by request parameters.

Example response:
{
  "incidentNumber": 42,
  "actionNames": ["UsersController#show"],
  "mean": 1234.5,
  "samples": [
    {
      "id": "sample-789",
      "time": "2024-01-15T14:29:00Z",
      "action": "UsersController#show",
      "duration": 1523.4,
      "queueDuration": 45.2,
      "hasNPlusOne": true,
      "params": "{\\"id\\":\\"42\\",\\"include\\":\\"profile,settings\\"}",
      "overview": [
        {"key": "hostname", "value": "web-01"},
        {"key": "path", "value": "/users/42"}
      ],
      "groupDurations": [
        {"key": "sql", "value": 856.3},
        {"key": "view_rendering", "value": 445.2},
        {"key": "other", "value": 221.9}
      ]
    },
    {
      "id": "sample-790",
      "time": "2024-01-15T14:28:30Z",
      "action": "UsersController#show",
      "duration": 1089.2,
      "queueDuration": 32.1,
      "hasNPlusOne": true,
      "params": "{\\"id\\":\\"43\\"}",
      "overview": [
        {"key": "hostname", "value": "web-02"},
        {"key": "path", "value": "/users/43"}
      ],
      "groupDurations": [
        {"key": "sql", "value": 623.1},
        {"key": "view_rendering", "value": 334.0},
        {"key": "other", "value": 132.1}
      ]
    }
  ]
}

Field meanings:
- incidentNumber: The incident these samples belong to
- actionNames: Controller actions affected by this incident
- mean: Average duration across all samples (in milliseconds)
- samples: Array of individual request samples
  - duration: Total request duration in milliseconds
  - queueDuration: Time spent waiting in queue before processing
  - hasNPlusOne: Whether N+1 query patterns were detected
  - params: JSON string of request parameters
  - overview: Key-value pairs with request metadata (hostname, path, etc.)
  - groupDurations: Timing breakdown by component (sql, view_rendering, etc.)

Use cases:
- Comparing multiple slow requests to identify patterns
- Analyzing if performance varies by request parameters
- Understanding which components (database, views) are consistently slow
- Identifying if N+1 queries occur in all samples or just some
- Getting a representative sample set for performance investigation`,
    inputSchema: GetPerfSamplesShape,
    handler: async (args: unknown) => {
      const { actionName, limit } = GetPerfSamplesSchema.parse(args || {});
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
        const actualLimit = limit ?? 10;
        const result = await client.getPerformanceSamples(actionName, actualLimit);

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
              text: `Error fetching performance samples: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
