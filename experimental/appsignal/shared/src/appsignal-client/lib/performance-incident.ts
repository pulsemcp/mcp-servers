import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { PerformanceIncident } from './performance-incidents.js';

interface GetPerformanceIncidentResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        performanceIncidents: PerformanceIncident[];
      }>;
    }>;
  };
}

export async function getPerformanceIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<PerformanceIncident> {
  const query = gql`
    query GetPerformanceIncident($limit: Int!, $offset: Int!) {
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

  // Search through incidents to find the one with matching ID
  const limit = 50;
  let offset = 0;
  let found: PerformanceIncident | null = null;

  while (!found) {
    const data = await graphqlClient.request<GetPerformanceIncidentResponse>(query, {
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

    // Check if we found the incident
    const incident = incidents.find((inc) => inc.id === incidentId);
    if (incident) {
      found = incident;
      break;
    }

    // If we got fewer incidents than the limit, we've reached the end
    if (incidents.length < limit) {
      break;
    }

    offset += limit;
  }

  if (!found) {
    throw new Error(`Performance incident with ID ${incidentId} not found`);
  }

  return found;
}
