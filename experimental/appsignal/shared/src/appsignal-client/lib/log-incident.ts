import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface LogIncident {
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
}

interface GetLogIncidentResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        logIncidents: Array<{
          id: string;
          number: number;
          summary?: string;
          description?: string;
          severity?: 'critical' | 'high' | 'medium' | 'low' | 'debug' | 'UNTRIAGED';
          state?: 'open' | 'closed' | 'OPEN' | 'CLOSED';
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
      }>;
    }>;
  };
}

export async function getLogIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<LogIncident> {
  const query = gql`
    query GetLogIncident($limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            logIncidents(limit: $limit, offset: $offset, order: LAST, state: OPEN) {
              id
              number
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
    }
  `;

  // Search through incidents to find the one with matching ID
  const limit = 50;
  let offset = 0;
  let found: LogIncident | null = null;

  while (!found) {
    const data = await graphqlClient.request<GetLogIncidentResponse>(query, {
      limit,
      offset,
    });

    // Find the app with matching ID
    let incidents: GetLogIncidentResponse['viewer']['organizations'][0]['apps'][0]['logIncidents'] = [];
    for (const org of data.viewer.organizations) {
      const app = org.apps.find((a) => a.id === appId);
      if (app) {
        incidents = app.logIncidents || [];
        break;
      }
    }

    // Check if we found the incident
    const incident = incidents.find((inc) => inc.id === incidentId);
    if (incident) {
      found = {
        id: incident.id,
        number: incident.number,
        summary: undefined, // summary field causes 500 errors
        description: incident.description,
        severity: incident.severity,
        state: incident.state?.toLowerCase() as 'open' | 'closed' | undefined,
        count: incident.count,
        createdAt: incident.createdAt,
        lastOccurredAt: incident.lastOccurredAt,
        updatedAt: incident.updatedAt,
        digests: incident.digests,
        trigger: incident.trigger,
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
    throw new Error(`Log incident ${incidentId} not found for app ${appId}`);
  }

  return found;
}
