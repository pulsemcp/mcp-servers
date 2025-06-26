import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { AnomalyIncidentData, IncidentListResult } from '../../types.js';

interface GetAnomalyIncidentsResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        paginatedAnomalyIncidents: {
          rows: Array<{
            id: string;
            number: number;
            description?: string;
            state?: string;
            count: number;
            createdAt?: string;
            lastOccurredAt?: string;
            updatedAt?: string;
            digests?: string[];
            alertState?: string;
            trigger?: {
              id: string;
              name: string;
              description?: string;
            };
            tags?: Array<{
              key: string;
              value: string;
            }>;
          }>;
          total: number;
        };
      }>;
    }>;
  };
}

export async function getAnomalyIncidents(
  graphqlClient: GraphQLClient,
  appId: string,
  states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
  limit = 50,
  offset = 0
): Promise<IncidentListResult<AnomalyIncidentData>> {
  const query = gql`
    query GetAnomalyIncidents($state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            paginatedAnomalyIncidents(state: $state, limit: $limit, offset: $offset, order: LAST) {
              total
              rows {
                id
                number
                description
                state
                count
                createdAt
                lastOccurredAt
                updatedAt
                digests
                alertState
                trigger {
                  id
                  name
                  description
                }
                tags {
                  key
                  value
                }
              }
            }
          }
        }
      }
    }
  `;

  const allIncidents: AnomalyIncidentData[] = [];

  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of states) {
    const data = await graphqlClient.request<GetAnomalyIncidentsResponse>(query, {
      state,
      limit,
      offset,
    });

    // Find the app with matching ID
    let targetApp: {
      paginatedAnomalyIncidents: GetAnomalyIncidentsResponse['viewer']['organizations'][0]['apps'][0]['paginatedAnomalyIncidents'];
    } | null = null;
    for (const org of data.viewer.organizations) {
      const app = org.apps.find((a) => a.id === appId);
      if (app) {
        targetApp = app;
        break;
      }
    }

    if (!targetApp) {
      throw new Error(`App with ID ${appId} not found`);
    }

    const incidents = targetApp.paginatedAnomalyIncidents?.rows || [];

    for (const incident of incidents) {
      allIncidents.push({
        id: incident.id,
        number: incident.number,
        summary: undefined,
        description: incident.description,
        state: incident.state as 'open' | 'closed' | 'wip' | undefined,
        count: incident.count,
        createdAt: incident.createdAt,
        lastOccurredAt: incident.lastOccurredAt,
        updatedAt: incident.updatedAt,
        digests: incident.digests,
        alertState: incident.alertState,
        trigger: incident.trigger,
        tags: incident.tags,
      });
    }
  }

  return {
    incidents: allIncidents,
    total: allIncidents.length,
    hasMore: allIncidents.length >= limit,
  };
}
