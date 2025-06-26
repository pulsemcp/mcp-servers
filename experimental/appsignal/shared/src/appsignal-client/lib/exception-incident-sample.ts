import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface ExceptionIncidentSample {
  id: string;
  timestamp: string;
  message: string;
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

interface GetExceptionIncidentSamplesResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        exceptionIncidents: Array<{
          id: string;
          number: string;
          samples: Array<{
            id: string;
            time: string;
            action: string;
            namespace: string;
            revision: string;
            version: string;
            duration: number | null;
            queueDuration: number | null;
            createdAt: string;
            params: Record<string, unknown> | null;
            customData: Record<string, unknown> | null;
            sessionData: Record<string, unknown> | null;
          }>;
        }>;
      }>;
    }>;
  };
}

export async function getExceptionIncidentSample(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentNumber: string,
  offset = 0
): Promise<ExceptionIncidentSample> {
  // Note: The 'exception' field causes 500 errors in the AppSignal API
  // We can retrieve most sample data but not the actual exception details
  const query = gql`
    query GetExceptionIncidentSamples($limit: Int!) {
      viewer {
        organizations {
          apps {
            id
            exceptionIncidents {
              id
              number
              samples(limit: $limit) {
                id
                time
                action
                namespace
                revision
                version
                duration
                queueDuration
                createdAt
                params
                customData
                sessionData
              }
            }
          }
        }
      }
    }
  `;

  // Note: AppSignal API doesn't support filtering incidents by ID or state in this query
  // We have to fetch all incidents and find the one we need
  const data = await graphqlClient.request<GetExceptionIncidentSamplesResponse>(query, {
    limit: offset + 1, // Fetch enough samples to include the one at the offset
  });

  // Find the app and incident
  let samples: GetExceptionIncidentSamplesResponse['viewer']['organizations'][0]['apps'][0]['exceptionIncidents'][0]['samples'] =
    [];
  for (const org of data.viewer.organizations) {
    const app = org.apps.find((a) => a.id === appId);
    if (app) {
      const incident = app.exceptionIncidents.find((i) => i.number === incidentNumber);
      if (incident && incident.samples) {
        samples = incident.samples;
        break;
      }
    }
  }

  if (samples.length === 0) {
    throw new Error(`No samples found for exception incident with number ${incidentNumber}`);
  }

  if (offset >= samples.length) {
    throw new Error(
      `No sample found at offset ${offset} for exception incident with number ${incidentNumber} (only ${samples.length} samples available)`
    );
  }

  const sample = samples[offset];

  // Note: Exception details (message, backtrace) are not available due to API limitation
  // The 'exception' field causes 500 errors when included in the query
  const message =
    'Exception details not available due to AppSignal API limitation. ' +
    'The exception field cannot be queried without causing server errors.';

  return {
    id: sample.id,
    timestamp: sample.time,
    message,
    action: sample.action || 'unknown',
    namespace: sample.namespace || 'unknown',
    revision: sample.revision || 'unknown',
    version: sample.version || 'unknown',
    duration: sample.duration || undefined,
    queueDuration: sample.queueDuration || undefined,
    params: sample.params || undefined,
    customData: sample.customData || undefined,
    sessionData: sample.sessionData || undefined,
  };
}
