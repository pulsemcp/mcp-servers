import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { AnomalyIncidentData } from '../../types.js';

interface GetAnomalyIncidentResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        anomalyIncidents: Array<{
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
      }>;
    }>;
  };
}

export async function getAnomalyIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<AnomalyIncidentData> {
  const query = gql`
    query GetAnomalyIncident($limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            anomalyIncidents(limit: $limit, offset: $offset, order: LAST, state: OPEN) {
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
  `;

  // Search through incidents to find the one with matching ID
  const limit = 50;
  let offset = 0;
  let found: AnomalyIncidentData | null = null;

  while (!found) {
    const data = await graphqlClient.request<GetAnomalyIncidentResponse>(query, {
      limit,
      offset,
    });

    // Find the app with matching ID
    let incidents: GetAnomalyIncidentResponse['viewer']['organizations'][0]['apps'][0]['anomalyIncidents'] = [];
    for (const org of data.viewer.organizations) {
      const app = org.apps.find((a) => a.id === appId);
      if (app) {
        incidents = app.anomalyIncidents || [];
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
        state: incident.state as 'open' | 'closed' | 'wip' | undefined,
        count: incident.count,
        createdAt: incident.createdAt,
        lastOccurredAt: incident.lastOccurredAt,
        updatedAt: incident.updatedAt,
        digests: incident.digests,
        alertState: incident.alertState,
        trigger: incident.trigger,
        tags: incident.tags,
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
    throw new Error(`Anomaly incident ${incidentId} not found for app ${appId}`);
  }

  return found;

  // This line is removed as we now return found directly
}
