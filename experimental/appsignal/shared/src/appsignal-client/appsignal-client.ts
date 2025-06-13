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
  metadata?: Record<string, unknown>;
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
  getExceptionIncidentSamples(
    incidentId: string,
    limit?: number
  ): Promise<ExceptionIncidentSample[]>;
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

  async getExceptionIncident(_incidentId: string): Promise<ExceptionIncident> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async getExceptionIncidentSamples(
    _incidentId: string,
    _limit = 10
  ): Promise<ExceptionIncidentSample[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
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
