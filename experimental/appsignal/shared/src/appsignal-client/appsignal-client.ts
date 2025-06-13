import { GraphQLClient, gql } from 'graphql-request';
import type { App } from '../graphql/types.js';

// AppSignal API client interface
export interface ExceptionIncident {
  id: string;
  name: string;
  message: string;
  count: number;
  lastOccurredAt: string;
  status: 'open' | 'resolved' | 'muted';
}

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

export interface LogIncident {
  id: string;
  name: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  count: number;
  lastOccurredAt: string;
  status: 'open' | 'resolved' | 'muted';
  query?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface IAppsignalClient {
  getApps(): Promise<Array<{ id: string; name: string; environment: string }>>;
  getExceptionIncident(incidentId: string): Promise<ExceptionIncident>;
  getExceptionIncidentSample(incidentId: string, offset?: number): Promise<ExceptionIncidentSample>;
  getLogIncident(incidentId: string): Promise<LogIncident>;
  searchLogs(query: string, limit?: number, offset?: number): Promise<LogEntry[]>;
}

// Implementation using GraphQL API
export class AppsignalClient implements IAppsignalClient {
  private graphqlClient: GraphQLClient;

  constructor(
    private readonly apiKey: string,
    private readonly appId: string
  ) {
    // appId will be used in future API calls
    void this.appId;
    this.graphqlClient = new GraphQLClient(`https://appsignal.com/graphql?token=${apiKey}`);
  }

  async getApps(): Promise<Array<{ id: string; name: string; environment: string }>> {
    const query = gql`
      query GetApps {
        viewer {
          organizations {
            apps {
              id
              name
              environment
            }
          }
        }
      }
    `;

    interface GetAppsResponse {
      viewer: {
        organizations: Array<{
          apps: Array<Pick<App, 'id' | 'name' | 'environment'>>;
        }>;
      };
    }

    const data = await this.graphqlClient.request<GetAppsResponse>(query);

    // Flatten all apps from all organizations
    const allApps = data.viewer.organizations.flatMap((org) => org.apps || []);

    return allApps.map((app) => ({
      id: app.id,
      name: app.name,
      environment: app.environment,
    }));
  }

  async getExceptionIncident(incidentId: string): Promise<ExceptionIncident> {
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

    // Search through OPEN incidents to find the one with matching ID
    const limit = 50;
    let offset = 0;
    let found: ExceptionIncident | null = null;

    while (!found) {
      const data = await this.graphqlClient.request<GetExceptionIncidentResponse>(query, {
        appId: this.appId,
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

  async getExceptionIncidentSample(
    incidentId: string,
    offset = 0
  ): Promise<ExceptionIncidentSample> {
    const query = gql`
      query GetExceptionIncidentSamples(
        $appId: ID!
        $incidentId: ID!
        $limit: Int!
        $offset: Int!
      ) {
        app(id: $appId) {
          exceptionIncident(id: $incidentId) {
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
    `;

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
      app: {
        exceptionIncident: {
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
        } | null;
      } | null;
    }

    const data = await this.graphqlClient.request<GetExceptionIncidentSamplesResponse>(query, {
      appId: this.appId,
      incidentId,
      limit: 1, // Only get one sample at a time
      offset,
    });

    const samples = data.app?.exceptionIncident?.samples || [];
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

  async getLogIncident(_incidentId: string): Promise<LogIncident> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async searchLogs(_query: string, _limit = 100, _offset = 0): Promise<LogEntry[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }
}
