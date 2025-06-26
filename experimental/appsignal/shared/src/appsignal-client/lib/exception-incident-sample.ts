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
        createdAt: string;
        action: string;
        customData: Record<string, unknown> | null;
        duration: number | null;
        namespace: string;
        originalId: string;
        originallyRequested: boolean;
        queueDuration: number | null;
        params: Record<string, unknown> | null;
        revision: string;
        sessionData: Record<string, unknown> | null;
        version: string;
        overview: Array<{ key: string; value: string }>;
        firstMarker: {
          user: string;
          shortRevision: string;
          revision: string;
          namespace: string;
          liveForInWords: string;
          liveFor: number;
          gitCompareUrl: string | null;
          id: string;
          exceptionRate: number;
          exceptionCount: number;
          createdAt: string;
        } | null;
        exception: {
          message: string;
          name: string;
          backtrace: Backtrace[];
        };
        errorCauses: Array<{
          message: string;
          name: string;
          firstLine: Backtrace;
        }>;
        environment: Array<{ key: string; value: string }>;
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
  const query = gql`
    query GetExceptionIncidentSamples($limit: Int!, $offset: Int!) {
      viewer {
        organizations {
          apps {
            id
            exceptionIncidents(state: OPEN, limit: 50) {
              id
              samples(limit: $limit, offset: $offset) {
            action
            createdAt
            customData
            duration
            id
            namespace
            originalId
            originallyRequested
            queueDuration
            params
            revision
            sessionData
            time
            version
            overview {
              key
              value
            }
            firstMarker {
              user
              shortRevision
              revision
              namespace
              liveForInWords
              liveFor
              gitCompareUrl
              id
              exceptionRate
              exceptionCount
              createdAt
            }
            exception {
              message
              name
              backtrace {
                column
                code {
                  line
                  source
                }
                error {
                  class
                  message
                }
                line
                method
                original
                path
                type
                url
              }
            }
            errorCauses {
              message
              name
              firstLine {
                column
                code {
                  line
                  source
                }
                line
                error {
                  class
                  message
                }
                method
                original
                type
                url
                path
              }
            }
            environment {
              key
              value
            }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetExceptionIncidentSamplesResponse>(query, {
    limit: 1, // Only get one sample at a time
    offset,
  });

  // Find the app and incident
  let samples: GetExceptionIncidentSamplesResponse['viewer']['organizations'][0]['apps'][0]['exceptionIncidents'][0]['samples'] = [];
  for (const org of data.viewer.organizations) {
    const app = org.apps.find((a) => a.id === appId);
    if (app) {
      const incident = app.exceptionIncidents.find((i) => i.id === incidentId);
      if (incident && incident.samples) {
        samples = incident.samples;
        break;
      }
    }
  }

  if (samples.length === 0) {
    throw new Error(`No samples found for exception incident ${incidentId} at offset ${offset}`);
  }

  const sample = samples[0];

  // Transform backtrace to simple string array
  const backtrace = sample.exception.backtrace
    .map((bt) => `${bt.path}:${bt.line} in ${bt.method}`)
    .filter(Boolean);

  // Simplify error causes
  const errorCauses = sample.errorCauses?.map((cause) => ({
    name: cause.name,
    message: cause.message,
    firstLine: `${cause.firstLine.path}:${cause.firstLine.line} in ${cause.firstLine.method}`,
  }));

  // Simplify firstMarker if present
  const firstMarker = sample.firstMarker
    ? {
        revision: sample.firstMarker.revision,
        shortRevision: sample.firstMarker.shortRevision,
        liveFor: sample.firstMarker.liveFor,
        liveForInWords: sample.firstMarker.liveForInWords,
        exceptionRate: sample.firstMarker.exceptionRate,
        exceptionCount: sample.firstMarker.exceptionCount,
        createdAt: sample.firstMarker.createdAt,
      }
    : undefined;

  return {
    id: sample.id,
    timestamp: sample.time,
    message: sample.exception.message,
    backtrace,
    action: sample.action,
    namespace: sample.namespace,
    revision: sample.revision,
    version: sample.version,
    duration: sample.duration || undefined,
    queueDuration: sample.queueDuration || undefined,
    params: sample.params || undefined,
    customData: sample.customData || undefined,
    sessionData: sample.sessionData || undefined,
    overview: sample.overview,
    environment: sample.environment,
    errorCauses,
    firstMarker,
  };
}
