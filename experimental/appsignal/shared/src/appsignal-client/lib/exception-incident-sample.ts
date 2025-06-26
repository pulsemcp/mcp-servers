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

export async function getExceptionIncidentSample(
  _graphqlClient: GraphQLClient,
  _appId: string,
  incidentId: string,
  _offset = 0
): Promise<ExceptionIncidentSample> {
  // Note: The AppSignal GraphQL API has limitations with querying samples
  // The API returns 500 errors when trying to query samples on exception incidents
  // This appears to be a server-side limitation

  // For now, return a meaningful error message explaining the limitation
  throw new Error(
    `Unable to fetch exception incident samples: AppSignal API limitation. ` +
      `The GraphQL API returns server errors when querying samples. ` +
      `Please use the AppSignal dashboard to view exception samples for incident ${incidentId}.`
  );
}
