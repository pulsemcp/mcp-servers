import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { ExceptionIncident } from './exception-incident.js';
import type { IncidentListResult } from '../../types.js';

interface GetExceptionIncidentsResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        paginatedExceptionIncidents: {
          rows: Array<{
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
      }>;
    }>;
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
    query GetExceptionIncidents(
      $state: IncidentStateEnum
      $limit: Int!
      $offset: Int!
    ) {
      viewer {
        organizations {
          apps {
            id
            paginatedExceptionIncidents(state: $state, limit: $limit, offset: $offset, order: LAST) {
              total
              rows {
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
      }
    }
  `;

  const allIncidents: ExceptionIncident[] = [];

  // Query for each state individually (GraphQL API doesn't support multiple states in one query)
  for (const state of states) {
    const data = await graphqlClient.request<GetExceptionIncidentsResponse>(query, {
      state,
      limit,
      offset,
    });

    // Find the app with matching ID
    let targetApp: { paginatedExceptionIncidents: any } | null = null;
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

    const incidents = targetApp.paginatedExceptionIncidents?.rows || [];

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
