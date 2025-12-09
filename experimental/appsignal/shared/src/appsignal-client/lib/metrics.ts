import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface MetricTag {
  key: string;
  value: string;
}

export interface MetricField {
  key: string;
  value: number | null;
}

export interface MetricRow {
  id: string;
  name: string;
  tags: MetricTag[];
  fields: MetricField[];
}

export interface MetricsResult {
  start: string;
  end: string;
  total: number | null;
  rows: MetricRow[];
}

export type TimeframeEnum = 'R1H' | 'R4H' | 'R8H' | 'R12H' | 'R24H' | 'R48H' | 'R7D' | 'R30D';
export type MetricFieldEnum = 'MEAN' | 'P90' | 'P95' | 'COUNT' | 'GAUGE' | 'COUNTER';
export type MetricAggregateEnum = 'MAX' | 'MIN' | 'AVG' | 'SUM' | 'FIRST' | 'LAST';

export interface MetricQueryInput {
  name: string;
  fields: Array<{ field: MetricFieldEnum; aggregate: MetricAggregateEnum }>;
  tags: MetricTag[];
}

interface GetMetricsResponse {
  app: {
    metrics: {
      list: {
        start: string;
        end: string;
        total: number | null;
        rows: MetricRow[];
      };
    };
  };
}

export async function getMetrics(
  graphqlClient: GraphQLClient,
  appId: string,
  metricName: string,
  namespace: string,
  timeframe: TimeframeEnum = 'R24H',
  limit = 30
): Promise<MetricsResult> {
  // NOTE: Unlike logs, the metrics API supports direct app(id:) queries
  // We construct the query dynamically to embed metricName and namespace
  // since these need to be part of the query structure, not variables
  const query = gql`
    query GetMetrics($appId: String!, $timeframe: TimeframeEnum!, $limit: Int!) {
      app(id: $appId) {
        metrics {
          list(
            timeframe: $timeframe
            query: [
              {
                name: "${metricName}"
                fields: [
                  { field: MEAN, aggregate: AVG }
                  { field: COUNT, aggregate: SUM }
                  { field: P95, aggregate: AVG }
                ]
                tags: [{ key: "namespace", value: "${namespace}" }]
              }
            ]
            limit: $limit
          ) {
            start
            end
            total
            rows {
              id
              name
              tags {
                key
                value
              }
              fields {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetMetricsResponse>(query, {
    appId,
    timeframe,
    limit,
  });

  return data.app.metrics.list;
}
