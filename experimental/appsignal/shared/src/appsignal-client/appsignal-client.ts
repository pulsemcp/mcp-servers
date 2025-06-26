import { GraphQLClient } from 'graphql-request';
import { getApps } from './lib/get-apps.js';
import { getExceptionIncident, type ExceptionIncident } from './lib/exception-incident.js';
import {
  getExceptionIncidentSample,
  type ExceptionIncidentSample,
} from './lib/exception-incident-sample.js';
import { getLogIncident, type LogIncident } from './lib/log-incident.js';
import { searchLogs, type LogSearchResult } from './lib/search-logs.js';

// Re-export interfaces for backward compatibility
export type { ExceptionIncident, ExceptionIncidentSample, LogIncident, LogSearchResult };

export interface IAppsignalClient {
  getApps(): Promise<Array<{ id: string; name: string; environment: string }>>;
  getExceptionIncident(incidentId: string): Promise<ExceptionIncident>;
  getExceptionIncidentSample(incidentId: string, offset?: number): Promise<ExceptionIncidentSample>;
  getLogIncident(incidentId: string): Promise<LogIncident>;
  searchLogs(
    query: string,
    limit?: number,
    severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>
  ): Promise<LogSearchResult>;
}

// Implementation using GraphQL API
export class AppsignalClient implements IAppsignalClient {
  private graphqlClient: GraphQLClient;

  constructor(
    apiKey: string,
    private readonly appId: string
  ) {
    this.graphqlClient = new GraphQLClient(`https://appsignal.com/graphql?token=${apiKey}`);
  }

  async getApps(): Promise<Array<{ id: string; name: string; environment: string }>> {
    return getApps(this.graphqlClient);
  }

  async getExceptionIncident(incidentId: string): Promise<ExceptionIncident> {
    return getExceptionIncident(this.graphqlClient, this.appId, incidentId);
  }

  async getExceptionIncidentSample(
    incidentId: string,
    offset = 0
  ): Promise<ExceptionIncidentSample> {
    return getExceptionIncidentSample(this.graphqlClient, this.appId, incidentId, offset);
  }

  async getLogIncident(incidentId: string): Promise<LogIncident> {
    return getLogIncident(this.graphqlClient, this.appId, incidentId);
  }

  async searchLogs(
    query: string,
    limit = 100,
    severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>
  ): Promise<LogSearchResult> {
    return searchLogs(this.graphqlClient, this.appId, query, limit, severities);
  }
}
