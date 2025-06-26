import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface ExceptionIncidentSample {
  id: string;
  timestamp: string;
  message: string;
  backtrace: string[];
  action: string;
  namespace: string;
  revision: string;
  version: string;
  duration?: number;
  queueDuration?: number;
  params?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  sessionData?: Record<string, unknown>;
  overview?: Array<{ key: string; value: string }>;
  environment?: Array<{ key: string; value: string }>;
  errorCauses?: Array<{
    name: string;
    message: string;
    firstLine: string;
  }>;
  firstMarker?: {
    revision: string;
    shortRevision: string;
    liveFor: number;
    liveForInWords: string;
    exceptionRate: number;
    exceptionCount: number;
    createdAt: string;
  };
}

interface Backtrace {
  column: number | null;
  code: {
    line: number;
    source: string;
  } | null;
  error: {
    class: string;
    message: string;
  } | null;
  line: number;
  method: string;
  original: string;
  path: string;
  type: string;
  url: string | null;
}

interface GetExceptionIncidentSamplesResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        exceptionIncidents: Array<{
          id: string;
          samples: Array<{
            id: string;
            time: string;
            action: string;
            namespace: string;
            revision: string;
            version: string;
            exception: {
              message: string;
              name: string;
              backtrace: Array<{
                line: number;
                method: string;
                path: string;
              }>;
            };
          }>;
        }>;
      }>;
    }>;
  };
}

export async function getExceptionIncidentSample(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string,
  offset = 0
): Promise<ExceptionIncidentSample> {
  // The samples field expects start/end dates, not just a limit
  // We'll query for samples from the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const query = gql`
    query GetExceptionIncidentSamples($limit: Int!, $offset: Int!, $start: DateTime!, $end: DateTime!) {
      viewer {
        organizations {
          apps {
            id
            exceptionIncidents(limit: $limit, offset: $offset, order: LAST, state: OPEN) {
              id
              samples(start: $start, end: $end, limit: 10) {
                id
                time
                action
                namespace
                revision
                version
                exception {
                  message
                  name
                  backtrace {
                    line
                    method
                    path
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Search through incidents to find the one with matching ID
  const incidentLimit = 50;
  let incidentOffset = 0;
  let targetSamples: GetExceptionIncidentSamplesResponse['viewer']['organizations'][0]['apps'][0]['exceptionIncidents'][0]['samples'] | null = null;

  while (!targetSamples) {
    const data = await graphqlClient.request<GetExceptionIncidentSamplesResponse>(query, {
      limit: incidentLimit,
      offset: incidentOffset,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // Find the app and incident
    for (const org of data.viewer.organizations) {
      const app = org.apps.find((a) => a.id === appId);
      if (app) {
        const incident = app.exceptionIncidents.find((i) => i.id === incidentId);
        if (incident && incident.samples) {
          targetSamples = incident.samples;
          break;
        }
      }
    }

    // If we didn't find the incident and got fewer results than the limit, we've searched all
    if (!targetSamples) {
      let totalIncidents = 0;
      for (const org of data.viewer.organizations) {
        const app = org.apps.find((a) => a.id === appId);
        if (app) {
          totalIncidents = app.exceptionIncidents.length;
          break;
        }
      }
      
      if (totalIncidents < incidentLimit) {
        // Try searching in CLOSED incidents as well
        const closedData = await graphqlClient.request<GetExceptionIncidentSamplesResponse>(
          query.replace('state: OPEN', 'state: CLOSED'),
          {
            limit: 50,
            offset: 0,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }
        );
        
        for (const org of closedData.viewer.organizations) {
          const app = org.apps.find((a) => a.id === appId);
          if (app) {
            const incident = app.exceptionIncidents.find((i) => i.id === incidentId);
            if (incident && incident.samples) {
              targetSamples = incident.samples;
              break;
            }
          }
        }
        
        break;
      }
      
      incidentOffset += incidentLimit;
    }
  }

  if (!targetSamples || targetSamples.length === 0) {
    throw new Error(`No samples found for exception incident ${incidentId}`);
  }

  if (offset >= targetSamples.length) {
    throw new Error(`No sample found at offset ${offset} for exception incident ${incidentId} (only ${targetSamples.length} samples available)`);
  }

  const sample = targetSamples[offset];

  // Transform backtrace to simple string array
  const backtrace = sample.exception.backtrace
    .map((bt) => `${bt.path}:${bt.line} in ${bt.method}`)
    .filter(Boolean);

  return {
    id: sample.id,
    timestamp: sample.time,
    message: sample.exception.message,
    backtrace,
    action: sample.action,
    namespace: sample.namespace,
    revision: sample.revision,
    version: sample.version,
  };
}
