import { GraphQLClient } from 'graphql-request';
import { getApps } from './lib/get-apps.js';
import { getExceptionIncident, type ExceptionIncident } from './lib/exception-incident.js';
import {
  getExceptionIncidentSample,
  type ExceptionIncidentSample,
} from './lib/exception-incident-sample.js';
import { getLogIncident, type LogIncident } from './lib/log-incident.js';
import { searchLogs, type LogSearchResult } from './lib/search-logs.js';
import { getAnomalyIncident } from './lib/anomaly-incident.js';
import { getLogIncidents } from './lib/list-log-incidents.js';
import { getExceptionIncidents } from './lib/list-exception-incidents.js';
import { getAnomalyIncidents } from './lib/list-anomaly-incidents.js';
import type { AnomalyIncidentData, IncidentListResult } from '../types.js';

// Re-export interfaces for backward compatibility
export type {
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
  AnomalyIncidentData,
  IncidentListResult,
};

export interface IAppsignalClient {
  getApps(): Promise<Array<{ id: string; name: string; environment: string }>>;
  getExceptionIncident(incidentId: string): Promise<ExceptionIncident>;
  getExceptionIncidentSample(incidentId: string, offset?: number): Promise<ExceptionIncidentSample>;
  getLogIncident(incidentId: string): Promise<LogIncident>;
  getAnomalyIncident(incidentId: string): Promise<AnomalyIncidentData>;
  searchLogs(
    query: string,
    limit?: number,
    severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>,
    start?: string,
    end?: string
  ): Promise<LogSearchResult>;
  getLogIncidents(
    states?: Array<'OPEN' | 'CLOSED' | 'WIP'>,
    limit?: number,
    offset?: number
  ): Promise<IncidentListResult<LogIncident>>;
  getExceptionIncidents(
    states?: Array<'OPEN' | 'CLOSED' | 'WIP'>,
    limit?: number,
    offset?: number
  ): Promise<IncidentListResult<ExceptionIncident>>;
  getAnomalyIncidents(
    states?: Array<'OPEN' | 'CLOSED' | 'WIP'>,
    limit?: number,
    offset?: number
  ): Promise<IncidentListResult<AnomalyIncidentData>>;
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
    severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>,
    start?: string,
    end?: string
  ): Promise<LogSearchResult> {
    return searchLogs(this.graphqlClient, this.appId, query, limit, severities, start, end);
  }

  async getAnomalyIncident(incidentId: string): Promise<AnomalyIncidentData> {
    return getAnomalyIncident(this.graphqlClient, this.appId, incidentId);
  }

  async getLogIncidents(
    states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
    limit = 50,
    offset = 0
  ): Promise<IncidentListResult<LogIncident>> {
    return getLogIncidents(this.graphqlClient, this.appId, states, limit, offset);
  }

  async getExceptionIncidents(
    states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
    limit = 50,
    offset = 0
  ): Promise<IncidentListResult<ExceptionIncident>> {
    return getExceptionIncidents(this.graphqlClient, this.appId, states, limit, offset);
  }

  async getAnomalyIncidents(
    states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
    limit = 50,
    offset = 0
  ): Promise<IncidentListResult<AnomalyIncidentData>> {
    return getAnomalyIncidents(this.graphqlClient, this.appId, states, limit, offset);
  }
}
