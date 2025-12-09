import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface PerformanceSampleOverview {
  key: string;
  value: string;
}

export interface GroupDuration {
  key: string;
  value: number;
}

export interface PerformanceSampleDetail {
  id: string;
  time: string;
  action: string;
  duration: number;
  queueDuration: number | null;
  hasNPlusOne: boolean;
  params: string | null;
  overview: PerformanceSampleOverview[];
  groupDurations: GroupDuration[];
}

export interface PerformanceSamplesResult {
  incidentNumber: number;
  actionNames: string[];
  mean: number;
  samples: PerformanceSampleDetail[];
}

interface GetPerformanceSamplesResponse {
  app: {
    performanceIncidents: Array<{
      number: number;
      actionNames: string[];
      mean: number;
      samples: PerformanceSampleDetail[];
    }>;
  };
}

export async function getPerformanceSamples(
  graphqlClient: GraphQLClient,
  appId: string,
  actionName: string,
  limit = 10
): Promise<PerformanceSamplesResult> {
  const query = gql`
    query GetPerformanceSamples($appId: String!, $actionName: String!, $limit: Int!) {
      app(id: $appId) {
        performanceIncidents(actionName: $actionName, limit: 1) {
          number
          actionNames
          mean
          samples(limit: $limit) {
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
  `;

  const data = await graphqlClient.request<GetPerformanceSamplesResponse>(query, {
    appId,
    actionName,
    limit,
  });

  const incidents = data.app.performanceIncidents;
  if (!incidents || incidents.length === 0) {
    throw new Error(`No performance incident found for action: ${actionName}`);
  }

  const incident = incidents[0];
  return {
    incidentNumber: incident.number,
    actionNames: incident.actionNames,
    mean: incident.mean,
    samples: incident.samples,
  };
}
