import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { AnomalyIncidentData, IncidentListResult } from '../../types.js';

interface GetAnomalyIncidentsResponse {
  app: {
    paginatedAnomalyIncidents: {
      incidents: Array<{
        id: string;
        number: number;
        summary?: string;
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
    query GetAnomalyIncidents($appId: ID!, $state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
      app(id: $appId) {
        paginatedAnomalyIncidents(state: $state, limit: $limit, offset: $offset, order: LAST) {
          total
          incidents {
            id
            number
            summary
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
  `;

  const allIncidents: AnomalyIncidentData[] = [];

  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of states) {
    const data = await graphqlClient.request<GetAnomalyIncidentsResponse>(query, {
      appId,
      state,
      limit,
      offset,
    });

    const incidents = data.app?.paginatedAnomalyIncidents?.incidents || [];

    for (const incident of incidents) {
      allIncidents.push({
        id: incident.id,
        number: incident.number,
        summary: incident.summary,
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
