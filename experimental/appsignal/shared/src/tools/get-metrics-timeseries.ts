import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  metricName: 'Name of the metric to retrieve (default: "transaction_duration" for response times)',
  namespace:
    'Application namespace to filter metrics (default: "web" for web requests, could also be "background" for background jobs)',
  timeframe:
    'Time window for the data (default: "R1H" for last hour). Options: R1H, R4H, R8H, R12H, R24H, R48H, R7D, R30D. Shorter timeframes give more granular data points',
} as const;

export function getMetricsTimeseriesTool(
  _server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetMetricsTimeseriesShape = {
    metricName: z.string().default('transaction_duration').describe(PARAM_DESCRIPTIONS.metricName),
    namespace: z.string().default('web').describe(PARAM_DESCRIPTIONS.namespace),
    timeframe: z
      .enum(['R1H', 'R4H', 'R8H', 'R12H', 'R24H', 'R48H', 'R7D', 'R30D'])
      .default('R1H')
      .describe(PARAM_DESCRIPTIONS.timeframe),
  };

  const GetMetricsTimeseriesSchema = z.object(GetMetricsTimeseriesShape);

  return {
    name: 'get_metrics_timeseries',
    description: `Retrieve time-series metrics data from AppSignal showing how metrics change over time. This tool returns data points with timestamps, useful for identifying performance trends, spikes, or degradations over a specified time window.

The tool retrieves both MEAN (average) and P95 (95th percentile) values for each data point, allowing you to see typical performance as well as worst-case scenarios. This is essential for:
- Identifying performance trends and patterns
- Detecting spikes or anomalies in application behavior
- Analyzing how metrics change during incidents
- Creating charts or visualizations of application performance
- Comparing performance across different time windows

Common metric names:
- transaction_duration: Response time/duration of requests (most common)
- throughput: Number of requests per time period
- error_rate: Rate of errors occurring
- database_query_time: Time spent in database queries
- memory_usage: Application memory consumption

Example response:
{
  "resolution": "60s",
  "start": "2024-01-15T15:00:00Z",
  "end": "2024-01-15T16:00:00Z",
  "keys": [
    {
      "name": "transaction_duration",
      "fields": ["MEAN", "P95"],
      "tags": [{ "key": "namespace", "value": "web" }]
    }
  ],
  "points": [
    {
      "timestamp": 1705329600,
      "values": [
        { "key": "transaction_duration.MEAN", "value": 125.5 },
        { "key": "transaction_duration.P95", "value": 450.2 }
      ]
    },
    {
      "timestamp": 1705329660,
      "values": [
        { "key": "transaction_duration.MEAN", "value": 132.8 },
        { "key": "transaction_duration.P95", "value": 425.1 }
      ]
    }
  ]
}

The resolution field indicates the time interval between data points (e.g., "60s" means one data point per minute). Shorter timeframes typically have finer resolution, while longer timeframes aggregate data into larger intervals.`,
    inputSchema: GetMetricsTimeseriesShape,
    handler: async (args: unknown) => {
      const { metricName, namespace, timeframe } = GetMetricsTimeseriesSchema.parse(args);
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
        const timeseries = await client.getMetricsTimeseries(metricName, namespace, timeframe);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(timeseries, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching metrics timeseries: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
