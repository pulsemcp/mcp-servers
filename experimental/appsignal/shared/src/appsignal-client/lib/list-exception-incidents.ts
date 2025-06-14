import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { ExceptionIncident } from './exception-incident.js';
import type { IncidentListResult } from '../../types.js';

interface GetExceptionIncidentsResponse {
  app: {
    paginatedExceptionIncidents: {
      incidents: Array<{
        id: string;
        exceptionName: string;
        exceptionMessage: string;
        count: number;
        lastOccurredAt: string;
        state: string;
        updatedAt: string;
        number: string;
        namespace: string;
        lastSampleOccurredAt: string;
        hasSamplesInRetention: boolean;
        firstBacktraceLine: string;
        digests: string[];
        description: string;
        createdAt: string;
        actionNames: string[];
      }>;
      total: number;
    };
  };
}

export async function getExceptionIncidents(
  graphqlClient: GraphQLClient,
  appId: string,
  states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
  limit = 50,
  offset = 0
): Promise<IncidentListResult<ExceptionIncident>> {
  const query = gql`
    query GetExceptionIncidents($appId: ID!, $state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
      app(id: $appId) {
        paginatedExceptionIncidents(state: $state, limit: $limit, offset: $offset, order: LAST) {
          total
          incidents {
            id
            exceptionName
            exceptionMessage
            count
            lastOccurredAt
            state
            updatedAt
            number
            namespace
            lastSampleOccurredAt
            hasSamplesInRetention
            firstBacktraceLine
            digests
            description
            createdAt
            actionNames
          }
        }
      }
    }
  `;

  const allIncidents: ExceptionIncident[] = [];
  
  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of states) {
    const data = await graphqlClient.request<GetExceptionIncidentsResponse>(query, {
      appId,
      state,
      limit,
      offset,
    });

    const incidents = data.app?.paginatedExceptionIncidents?.incidents || [];
    
    for (const incident of incidents) {
      allIncidents.push({
        id: incident.id,
        name: incident.exceptionName,
        message: incident.exceptionMessage,
        count: incident.count,
        lastOccurredAt: incident.lastOccurredAt,
        status: incident.state.toLowerCase() as 'open' | 'resolved' | 'muted',
      });
    }
  }

  return {
    incidents: allIncidents,
    total: allIncidents.length,
    hasMore: allIncidents.length >= limit,
  };
}