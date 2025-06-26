import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface PerformanceIncident {
  id: string;
  number: string;
  state: 'open' | 'closed' | 'wip';
  severity: string;
  actionNames: string[];
  namespace: string;
  mean: number;
  count: number;
  scopedCount: number;
  totalDuration: number;
  description: string;
  digests: string[];
  hasNPlusOne: boolean;
  hasSamplesInRetention: boolean;
  createdAt: string;
  lastOccurredAt: string;
  lastSampleOccurredAt: string;
  updatedAt: string;
}

interface GetPerformanceIncidentsResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        performanceIncidents: PerformanceIncident[];
      }>;
    }>;
  };
}

export async function getPerformanceIncidents(
  graphqlClient: GraphQLClient,
  appId: string,
  states: string[] = ['open'],
  limit = 50,
  offset = 0
): Promise<{ incidents: PerformanceIncident[]; total: number; hasMore: boolean }> {
  const query = gql`
    query GetPerformanceIncidents($limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            performanceIncidents(limit: $limit, offset: $offset) {
              id
              number
              state
              severity
              actionNames
              namespace
              mean
              count
              scopedCount
              totalDuration
              description
              digests
              hasNPlusOne
              hasSamplesInRetention
              createdAt
              lastOccurredAt
              lastSampleOccurredAt
              updatedAt
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetPerformanceIncidentsResponse>(query, {
    limit,
    offset,
  });

  // Find the app with matching ID
  let incidents: PerformanceIncident[] = [];
  for (const org of data.viewer.organizations) {
    const app = org.apps.find((a) => a.id === appId);
    if (app) {
      incidents = app.performanceIncidents || [];
      break;
    }
  }

  // Filter by state
  const filteredIncidents = incidents.filter((incident) =>
    states.map((s) => s.toLowerCase()).includes(incident.state.toLowerCase())
  );

  return {
    incidents: filteredIncidents,
    total: filteredIncidents.length,
    hasMore: incidents.length === limit,
  };
}
