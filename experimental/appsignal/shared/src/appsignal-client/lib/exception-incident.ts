import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface ExceptionIncident {
  id: string;
  name: string;
  message: string;
  count: number;
  lastOccurredAt: string;
  status: 'open' | 'resolved' | 'muted';
}

interface GetExceptionIncidentResponse {
  app: {
    exceptionIncidents: Array<{
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
  };
}

export async function getExceptionIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<ExceptionIncident> {
  const query = gql`
    query GetExceptionIncident($appId: ID!, $limit: Int!, $offset: Int!) {
      app(id: $appId) {
        exceptionIncidents(limit: $limit, offset: $offset, order: LAST, state: OPEN) {
          updatedAt
          state
          number
          namespace
          lastSampleOccurredAt
          lastOccurredAt
          id
          hasSamplesInRetention
          firstBacktraceLine
          exceptionName
          exceptionMessage
          digests
          description
          createdAt
          count
          actionNames
        }
      }
    }
  `;

  // Search through OPEN incidents to find the one with matching ID
  const limit = 50;
  let offset = 0;
  let found: ExceptionIncident | null = null;

  while (!found) {
    const data = await graphqlClient.request<GetExceptionIncidentResponse>(query, {
      appId,
      limit,
      offset,
    });

    const incidents = data.app?.exceptionIncidents || [];

    // Check if we found the incident
    const incident = incidents.find((inc) => inc.id === incidentId);
    if (incident) {
      found = {
        id: incident.id,
        name: incident.exceptionName,
        message: incident.exceptionMessage,
        count: incident.count,
        lastOccurredAt: incident.lastOccurredAt,
        status: 'open', // We only query OPEN incidents
      };
      break;
    }

    // If we got fewer incidents than the limit, we've reached the end
    if (incidents.length < limit) {
      break;
    }

    offset += limit;
  }

  if (!found) {
    throw new Error(`Exception incident with ID ${incidentId} not found`);
  }

  return found;
}