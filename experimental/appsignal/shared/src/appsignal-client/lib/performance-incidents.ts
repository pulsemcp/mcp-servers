import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface PerformanceIncident {
  id: string;
  number: string;
  state: 'OPEN' | 'CLOSED' | 'WIP';
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
        paginatedPerformanceIncidents: {
          rows: PerformanceIncident[];
          total: number;
        };
      }>;
    }>;
  };
}

export async function getPerformanceIncidents(
  graphqlClient: GraphQLClient,
  appId: string,
  states: string[] = ['OPEN'],
  limit = 50,
  offset = 0
): Promise<{ incidents: PerformanceIncident[]; total: number; hasMore: boolean }> {
  // States should already be uppercase, but ensure they are
  const statesToQuery = states.length === 0 
    ? ['OPEN'] 
    : states;
    
  const query = gql`
    query GetPerformanceIncidents($state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            paginatedPerformanceIncidents(
              state: $state
              limit: $limit
              offset: $offset
              order: LAST
            ) {
              total
              rows {
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
    }
  `;

  const allIncidents: PerformanceIncident[] = [];
  let totalCount = 0;

  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of statesToQuery) {
    const data = await graphqlClient.request<GetPerformanceIncidentsResponse>(query, {
      state,
      limit,
      offset,
    });

    // Find the app with matching ID
    for (const org of data.viewer.organizations) {
      const app = org.apps.find((a) => a.id === appId);
      if (app && app.paginatedPerformanceIncidents) {
        const incidents = app.paginatedPerformanceIncidents.rows || [];
        
        // Keep state as uppercase to match GraphQL enum
        incidents.forEach(incident => {
          allIncidents.push(incident);
        });
        
        totalCount += app.paginatedPerformanceIncidents.total || 0;
        break;
      }
    }
  }

  return {
    incidents: allIncidents,
    total: totalCount,
    hasMore: allIncidents.length >= limit,
  };
}
