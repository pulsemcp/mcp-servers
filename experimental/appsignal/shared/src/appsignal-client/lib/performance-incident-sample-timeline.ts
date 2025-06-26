import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface TimelineEvent {
  name: string;
  action: string;
  digest: string;
  group: string;
  level: number;
  duration: number;
  childDuration: number;
  allocationCount: number;
  childAllocationCount: number;
  count: number;
  time: number;
  end: number;
  wrapping: boolean;
  payload?: {
    name?: string;
    body?: string;
  };
}

export interface PerformanceIncidentSampleTimeline {
  sampleId: string;
  timeline: TimelineEvent[];
}

interface GetPerformanceIncidentSampleTimelineResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        performanceIncidents: Array<{
          id: string;
          number: string;
          sample: {
            id: string;
            timeline: TimelineEvent[];
          } | null;
        }>;
      }>;
    }>;
  };
}

export async function getPerformanceIncidentSampleTimeline(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentNumber: string
): Promise<PerformanceIncidentSampleTimeline> {
  const query = gql`
    query GetPerformanceIncidentSampleTimeline {
      viewer {
        organizations {
          apps {
            id
            performanceIncidents {
              id
              number
              sample {
                id
                timeline {
                  name
                  action
                  digest
                  group
                  level
                  duration
                  childDuration
                  allocationCount
                  childAllocationCount
                  count
                  time
                  end
                  wrapping
                  payload {
                    name
                    body
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetPerformanceIncidentSampleTimelineResponse>(query);

  // Find the app and incident
  let sampleId: string | null = null;
  let timeline: TimelineEvent[] = [];

  for (const org of data.viewer.organizations) {
    const app = org.apps.find((a) => a.id === appId);
    if (app) {
      const incident = app.performanceIncidents.find((i) => i.number === incidentNumber);
      if (incident && incident.sample) {
        sampleId = incident.sample.id;
        timeline = incident.sample.timeline || [];
        break;
      }
    }
  }

  if (!sampleId) {
    throw new Error(`No sample found for performance incident with number ${incidentNumber}`);
  }

  return {
    sampleId,
    timeline,
  };
}
