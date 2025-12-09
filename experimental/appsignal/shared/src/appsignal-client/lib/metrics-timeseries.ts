import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { TimeframeEnum } from './deploy-markers.js';

export interface TimeseriesKey {
  name: string;
  fields: string[];
  tags: Array<{ key: string; value: string }>;
}

export interface TimeseriesValue {
  key: string;
  value: number | null;
}

export interface TimeseriesPoint {
  timestamp: number;
  values: TimeseriesValue[];
}

export interface TimeseriesResult {
  resolution: string;
  start: string;
  end: string;
  keys: TimeseriesKey[];
  points: TimeseriesPoint[];
}

export type MetricFieldEnum = 'MEAN' | 'P90' | 'P95' | 'COUNT' | 'GAUGE' | 'COUNTER';

interface GetTimeseriesResponse {
  app: {
    metrics: {
      timeseries: TimeseriesResult;
    };
  };
}

// Validate input to prevent GraphQL injection
function validateSafeName(value: string, fieldName: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: only alphanumeric characters, underscores, and hyphens are allowed`
    );
  }
}

export async function getMetricsTimeseries(
  graphqlClient: GraphQLClient,
  appId: string,
  metricName: string,
  namespace: string,
  timeframe: TimeframeEnum = 'R1H'
): Promise<TimeseriesResult> {
  // Validate inputs to prevent GraphQL injection
  validateSafeName(metricName, 'metric name');
  validateSafeName(namespace, 'namespace');

  const query = gql`
    query GetTimeseries($appId: String!, $timeframe: TimeframeEnum!) {
      app(id: $appId) {
        metrics {
          timeseries(
            timeframe: $timeframe
            query: [
              {
                name: "${metricName}"
                fields: [
                  { field: MEAN }
                  { field: P95 }
                ]
                tags: [{ key: "namespace", value: "${namespace}" }]
              }
            ]
          ) {
            resolution
            start
            end
            keys {
              name
              fields
              tags {
                key
                value
              }
            }
            points {
              timestamp
              values {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetTimeseriesResponse>(query, {
    appId,
    timeframe,
  });

  return data.app.metrics.timeseries;
}
