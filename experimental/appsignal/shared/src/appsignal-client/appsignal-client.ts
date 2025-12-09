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
import { getPerformanceIncidents, type PerformanceIncident } from './lib/performance-incidents.js';
import { getPerformanceIncident } from './lib/performance-incident.js';
import {
  getPerformanceIncidentSample,
  type PerformanceIncidentSample,
} from './lib/performance-incident-sample.js';
import {
  getPerformanceIncidentSampleTimeline,
  type PerformanceIncidentSampleTimeline,
  type TimelineEvent,
} from './lib/performance-incident-sample-timeline.js';
import { getSlowRequests, type SlowRequestsResult } from './lib/slow-requests.js';
import { getDeployMarkers, type DeployMarker, type TimeframeEnum } from './lib/deploy-markers.js';
import { getMetrics, type MetricsResult } from './lib/metrics.js';
import {
  getPerformanceSamples,
  type PerformanceSamplesResult,
  type PerformanceSampleDetail,
  type PerformanceSampleOverview,
  type GroupDuration,
} from './lib/performance-samples.js';
import { getMetricsTimeseries, type TimeseriesResult } from './lib/metrics-timeseries.js';

// Re-export interfaces for backward compatibility
export type {
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
  AnomalyIncidentData,
  IncidentListResult,
  PerformanceIncident,
  PerformanceIncidentSample,
  PerformanceIncidentSampleTimeline,
  TimelineEvent,
  SlowRequestsResult,
  DeployMarker,
  TimeframeEnum,
  MetricsResult,
  PerformanceSamplesResult,
  PerformanceSampleDetail,
  PerformanceSampleOverview,
  GroupDuration,
  TimeseriesResult,
};

export interface IAppsignalClient {
  getApps(): Promise<Array<{ id: string; name: string; environment: string }>>;
  getExceptionIncident(incidentNumber: string): Promise<ExceptionIncident>;
  getExceptionIncidentSample(
    incidentNumber: string,
    offset?: number
  ): Promise<ExceptionIncidentSample>;
  getLogIncident(incidentNumber: string): Promise<LogIncident>;
  getAnomalyIncident(incidentNumber: string): Promise<AnomalyIncidentData>;
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
  getPerformanceIncidents(
    states?: Array<string>,
    limit?: number,
    offset?: number
  ): Promise<IncidentListResult<PerformanceIncident>>;
  getPerformanceIncident(incidentNumber: string): Promise<PerformanceIncident>;
  getPerformanceIncidentSample(incidentNumber: string): Promise<PerformanceIncidentSample>;
  getPerformanceIncidentSampleTimeline(
    incidentNumber: string
  ): Promise<PerformanceIncidentSampleTimeline>;
  getSlowRequests(
    namespace: string | null,
    incidentLimit?: number,
    samplesPerIncident?: number
  ): Promise<SlowRequestsResult>;
  getDeployMarkers(timeframe?: TimeframeEnum, limit?: number): Promise<DeployMarker[]>;
  getMetrics(
    metricName: string,
    namespace: string,
    timeframe?: TimeframeEnum,
    limit?: number
  ): Promise<MetricsResult>;
  getPerformanceSamples(actionName: string, limit?: number): Promise<PerformanceSamplesResult>;
  getMetricsTimeseries(
    metricName: string,
    namespace: string,
    timeframe?: TimeframeEnum
  ): Promise<TimeseriesResult>;
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

  async getExceptionIncident(incidentNumber: string): Promise<ExceptionIncident> {
    return getExceptionIncident(this.graphqlClient, this.appId, incidentNumber);
  }

  async getExceptionIncidentSample(
    incidentNumber: string,
    offset = 0
  ): Promise<ExceptionIncidentSample> {
    return getExceptionIncidentSample(this.graphqlClient, this.appId, incidentNumber, offset);
  }

  async getLogIncident(incidentNumber: string): Promise<LogIncident> {
    return getLogIncident(this.graphqlClient, this.appId, incidentNumber);
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

  async getAnomalyIncident(incidentNumber: string): Promise<AnomalyIncidentData> {
    return getAnomalyIncident(this.graphqlClient, this.appId, incidentNumber);
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

  async getPerformanceIncidents(
    states: Array<string> = ['OPEN'],
    limit = 50,
    offset = 0
  ): Promise<IncidentListResult<PerformanceIncident>> {
    return getPerformanceIncidents(this.graphqlClient, this.appId, states, limit, offset);
  }

  async getPerformanceIncident(incidentNumber: string): Promise<PerformanceIncident> {
    return getPerformanceIncident(this.graphqlClient, this.appId, incidentNumber);
  }

  async getPerformanceIncidentSample(incidentNumber: string): Promise<PerformanceIncidentSample> {
    return getPerformanceIncidentSample(this.graphqlClient, this.appId, incidentNumber);
  }

  async getPerformanceIncidentSampleTimeline(
    incidentNumber: string
  ): Promise<PerformanceIncidentSampleTimeline> {
    return getPerformanceIncidentSampleTimeline(this.graphqlClient, this.appId, incidentNumber);
  }

  async getSlowRequests(
    namespace: string | null = null,
    incidentLimit = 5,
    samplesPerIncident = 3
  ): Promise<SlowRequestsResult> {
    return getSlowRequests(
      this.graphqlClient,
      this.appId,
      namespace,
      incidentLimit,
      samplesPerIncident
    );
  }

  async getDeployMarkers(timeframe: TimeframeEnum = 'R7D', limit = 10): Promise<DeployMarker[]> {
    return getDeployMarkers(this.graphqlClient, this.appId, timeframe, limit);
  }

  async getMetrics(
    metricName: string,
    namespace: string,
    timeframe: TimeframeEnum = 'R24H',
    limit = 30
  ): Promise<MetricsResult> {
    return getMetrics(this.graphqlClient, this.appId, metricName, namespace, timeframe, limit);
  }

  async getPerformanceSamples(actionName: string, limit = 10): Promise<PerformanceSamplesResult> {
    return getPerformanceSamples(this.graphqlClient, this.appId, actionName, limit);
  }

  async getMetricsTimeseries(
    metricName: string,
    namespace: string,
    timeframe: TimeframeEnum = 'R1H'
  ): Promise<TimeseriesResult> {
    return getMetricsTimeseries(this.graphqlClient, this.appId, metricName, namespace, timeframe);
  }
}
