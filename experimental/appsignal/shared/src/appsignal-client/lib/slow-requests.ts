import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface SlowRequestOverview {
  key: string;
  value: string;
}

export interface SlowRequestDuration {
  key: string;
  value: number;
}

export interface SlowRequestSample {
  id: string;
  time: string;
  action: string;
  duration: number;
  queueDuration: number | null;
  hasNPlusOne: boolean;
  params: string | null;
  overview: SlowRequestOverview[];
  groupDurations: SlowRequestDuration[];
}

export interface SlowRequestIncident {
  number: number;
  actionNames: string[];
  mean: number;
  count: number;
  hasNPlusOne: boolean;
  namespace: string;
  samples: SlowRequestSample[];
}

export interface SlowRequestsResult {
  incidents: SlowRequestIncident[];
}

interface GetSlowRequestsResponse {
  app: {
    paginatedPerformanceIncidents: {
      rows: SlowRequestIncident[];
    };
  };
}

export async function getSlowRequests(
  graphqlClient: GraphQLClient,
  appId: string,
  namespace: string | null = null,
  incidentLimit = 5,
  samplesPerIncident = 3
): Promise<SlowRequestsResult> {
  // Build namespace filter if provided
  const namespaceFilter = namespace ? `namespaces: ["${namespace}"]` : '';

  const query = gql`
    query GetSlowRequests($appId: String!, $incidentLimit: Int!, $samplesPerIncident: Int!) {
      app(id: $appId) {
        paginatedPerformanceIncidents(
          state: OPEN
          limit: $incidentLimit
          order: LAST
          ${namespaceFilter}
        ) {
          rows {
            number
            actionNames
            mean
            count
            hasNPlusOne
            namespace
            samples(limit: $samplesPerIncident) {
              id
              time
              action
              duration
              queueDuration
              hasNPlusOne
              params
              overview {
                key
                value
              }
              groupDurations {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetSlowRequestsResponse>(query, {
    appId,
    incidentLimit,
    samplesPerIncident,
  });

  return {
    incidents: data.app.paginatedPerformanceIncidents.rows || [],
  };
}
