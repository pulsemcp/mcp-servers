import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface PerformanceIncidentSample {
  id: string;
  time: string;
  action: string;
  duration: number;
  queueDuration: number | null;
  namespace: string;
  revision: string;
  version: string;
  originalId: string;
  originallyRequested: boolean;
  hasNPlusOne: boolean;
  timelineTruncatedEvents: number;
  createdAt: string;
  customData?: Record<string, unknown>;
  params?: Record<string, unknown>;
  sessionData?: Record<string, unknown>;
}

interface GetPerformanceIncidentSampleResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        performanceIncidents: Array<{
          id: string;
          number: string;
          sample: PerformanceIncidentSample | null;
        }>;
      }>;
    }>;
  };
}

export async function getPerformanceIncidentSample(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentNumber: string
): Promise<PerformanceIncidentSample> {
  const query = gql`
    query GetPerformanceIncidentSample {
      viewer {
        organizations {
          apps {
            id
            performanceIncidents {
              id
              number
              sample {
                id
                time
                action
                duration
                queueDuration
                namespace
                revision
                version
                originalId
                originallyRequested
                hasNPlusOne
                timelineTruncatedEvents
                createdAt
                customData
                params
                sessionData
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetPerformanceIncidentSampleResponse>(query);

  // Find the app and incident
  let sample: PerformanceIncidentSample | null = null;
  for (const org of data.viewer.organizations) {
    const app = org.apps.find((a) => a.id === appId);
    if (app) {
      const incident = app.performanceIncidents.find((i) => i.number === incidentNumber);
      if (incident && incident.sample) {
        sample = incident.sample;
        break;
      }
    }
  }

  if (!sample) {
    throw new Error(`No sample found for performance incident with number ${incidentNumber}`);
  }

  return sample;
}
