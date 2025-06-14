import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { LogIncident } from './log-incident.js';
import type { IncidentListResult } from '../../types.js';

interface GetLogIncidentsResponse {
  app: {
    paginatedLogIncidents: {
      incidents: Array<{
        id: string;
        number: number;
        summary?: string;
        description?: string;
        severity?: string;
        state?: string;
        count: number;
        createdAt?: string;
        lastOccurredAt?: string;
        updatedAt?: string;
        digests?: string[];
        trigger: {
          id: string;
          name: string;
          description?: string;
          query?: string;
          severities: string[];
          sourceIds: string[];
        };
      }>;
      total: number;
    };
  };
}

export async function getLogIncidents(
  graphqlClient: GraphQLClient,
  appId: string,
  states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
  limit = 50,
  offset = 0
): Promise<IncidentListResult<LogIncident>> {
  const query = gql`
    query GetLogIncidents($appId: ID!, $state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
      app(id: $appId) {
        paginatedLogIncidents(state: $state, limit: $limit, offset: $offset, order: LAST) {
          total
          incidents {
            id
            number
            summary
            description
            severity
            state
            count
            createdAt
            lastOccurredAt
            updatedAt
            digests
            trigger {
              id
              name
              description
              query
              severities
              sourceIds
            }
          }
        }
      }
    }
  `;

  const allIncidents: LogIncident[] = [];
  
  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of states) {
    const data = await graphqlClient.request<GetLogIncidentsResponse>(query, {
      appId,
      state,
      limit,
      offset,
    });

    const incidents = data.app?.paginatedLogIncidents?.incidents || [];
    
    for (const incident of incidents) {
      allIncidents.push({
        id: incident.id,
        number: incident.number,
        summary: incident.summary,
        description: incident.description,
        severity: incident.severity,
        state: incident.state,
        count: incident.count,
        createdAt: incident.createdAt,
        lastOccurredAt: incident.lastOccurredAt,
        updatedAt: incident.updatedAt,
        digests: incident.digests,
        trigger: incident.trigger,
      });
    }
  }

  return {
    incidents: allIncidents,
    total: allIncidents.length,
    hasMore: allIncidents.length >= limit,
  };
}