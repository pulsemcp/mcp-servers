import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';
import type { TimeframeEnum } from '../appsignal-client/lib/metrics.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  metricName:
    'The metric to query. Default is "transaction_duration" which measures request response times',
  namespace:
    'Filter by namespace to separate different types of requests. Common values: "web" (web requests), "background" (background jobs), "api_v01" (API endpoints)',
  timeframe:
    'Time range for the metrics query. Options: R1H (last hour), R4H (4 hours), R8H (8 hours), R12H (12 hours), R24H (last 24 hours - default), R48H (48 hours), R7D (7 days), R30D (30 days)',
  limit: 'Maximum number of metric rows to return (default: 30)',
} as const;

export function getMetricsTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetMetricsShape = {
    metricName: z.string().default('transaction_duration').describe(PARAM_DESCRIPTIONS.metricName),
    namespace: z.string().default('web').describe(PARAM_DESCRIPTIONS.namespace),
    timeframe: z
      .enum(['R1H', 'R4H', 'R8H', 'R12H', 'R24H', 'R48H', 'R7D', 'R30D'])
      .default('R24H')
      .describe(PARAM_DESCRIPTIONS.timeframe),
    limit: z.number().int().positive().default(30).describe(PARAM_DESCRIPTIONS.limit),
  };

  const GetMetricsSchema = z.object(GetMetricsShape);

  return {
    name: 'get_metrics',
    description: `Retrieve aggregated performance metrics from AppSignal for your application. This tool provides statistical insights into application performance including mean response times, P95 (95th percentile), and request counts. Essential for understanding application performance trends, identifying slowdowns, and monitoring system health over time.

The tool returns metrics aggregated across the specified timeframe, helping you answer questions like:
- What's the average response time for web requests?
- How many requests is the application handling?
- What's the P95 response time (95% of requests complete faster than this)?

Example response:
{
  "start": "2024-01-15T00:00:00Z",
  "end": "2024-01-16T00:00:00Z",
  "total": 15,
  "rows": [
    {
      "id": "metric-123",
      "name": "transaction_duration",
      "tags": [
        { "key": "namespace", "value": "web" },
        { "key": "action", "value": "HomeController#index" }
      ],
      "fields": [
        { "key": "mean", "value": 145.3 },
        { "key": "count", "value": 1234 },
        { "key": "p95", "value": 287.5 }
      ]
    },
    {
      "id": "metric-456",
      "name": "transaction_duration",
      "tags": [
        { "key": "namespace", "value": "web" },
        { "key": "action", "value": "ApiController#show" }
      ],
      "fields": [
        { "key": "mean", "value": 89.2 },
        { "key": "count", "value": 5678 },
        { "key": "p95", "value": 156.8 }
      ]
    }
  ]
}

Understanding the metrics:
- mean: Average response time in milliseconds
- p95: 95th percentile response time - 95% of requests complete faster than this value
- count: Total number of requests/transactions in the timeframe

Common namespaces:
- web: HTTP web requests
- background: Background jobs and async tasks
- api_v01: API endpoint requests (version-specific)

Use cases:
- Monitoring overall application performance trends
- Identifying slow endpoints or controllers
- Comparing performance across different time periods
- Alerting on performance degradation
- Capacity planning based on request volumes`,
    inputSchema: GetMetricsShape,
    handler: async (args: unknown) => {
      const { metricName, namespace, timeframe, limit } = GetMetricsSchema.parse(args || {});
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
        const metrics = await client.getMetrics(
          metricName,
          namespace,
          timeframe as TimeframeEnum,
          limit
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
