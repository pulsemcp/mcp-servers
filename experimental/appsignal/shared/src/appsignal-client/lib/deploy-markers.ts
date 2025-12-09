import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface DeployMarker {
  id: string;
  revision: string;
  shortRevision: string;
  createdAt: string;
  user: string | null;
  exceptionCount: number;
}

export type TimeframeEnum = 'R1H' | 'R4H' | 'R8H' | 'R12H' | 'R24H' | 'R48H' | 'R7D' | 'R30D';

interface GetDeployMarkersResponse {
  app: {
    deployMarkers: DeployMarker[];
  };
}

export async function getDeployMarkers(
  graphqlClient: GraphQLClient,
  appId: string,
  timeframe: TimeframeEnum = 'R7D',
  limit = 10
): Promise<DeployMarker[]> {
  const query = gql`
    query GetDeployMarkers($appId: String!, $timeframe: TimeframeEnum!, $limit: Int!) {
      app(id: $appId) {
        deployMarkers(timeframe: $timeframe, limit: $limit) {
          id
          revision
          shortRevision
          createdAt
          user
          exceptionCount
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetDeployMarkersResponse>(query, {
    appId,
    timeframe,
    limit,
  });

  return data.app.deployMarkers;
}
