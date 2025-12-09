import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
  AnomalyIncidentData,
  IncidentListResult,
  PerformanceIncident,
  PerformanceIncidentSample,
  PerformanceIncidentSampleTimeline,
  SlowRequestsResult,
  DeployMarker,
  TimeframeEnum,
  MetricsResult,
  PerformanceSamplesResult,
  TimeseriesResult,
} from './appsignal-client.js';

export interface MockData {
  exceptionIncidents?: ExceptionIncident[];
  exceptionSamples?: Record<string, ExceptionIncidentSample[]>;
  logIncidents?: Record<string, LogIncident>;
  anomalyIncidents?: Record<string, AnomalyIncidentData>;
  searchResponses?: Record<string, LogSearchResult['lines']>;
  logIncidentLists?: IncidentListResult<LogIncident>;
  exceptionIncidentLists?: IncidentListResult<ExceptionIncident>;
  anomalyIncidentLists?: IncidentListResult<AnomalyIncidentData>;
  performanceIncidents?: PerformanceIncident[];
  performanceTimelineData?: Record<string, PerformanceIncidentSampleTimeline>;
  errorScenarios?: {
    logIncident?: Record<string, Error | string>;
    anomalyIncident?: Record<string, Error | string>;
    searchLogs?: Record<string, Error | string>;
    logIncidents?: Error | string;
    exceptionIncidents?: Error | string;
    anomalyIncidents?: Error | string;
    performanceIncidents?: Error | string;
  };
}

/**
 * Creates a mock implementation of IAppsignalClient for integration tests.
 * This is similar to the functional test mock but doesn't rely on vitest.
 * Instead, it uses provided mock data to simulate different scenarios.
 */
export function createIntegrationMockAppsignalClient(
  mockData: MockData = {}
): IAppsignalClient & { mockData: MockData } {
  const client = {
    mockData, // Store the mock data so it can be extracted later
    async getApps() {
      // Default mock apps
      return [
        { id: 'app-1', name: 'Production App', environment: 'production' },
        { id: 'app-2', name: 'Staging App', environment: 'staging' },
        { id: 'app-3', name: 'Development App', environment: 'development' },
      ];
    },

    async getExceptionIncident(incidentNumber: string): Promise<ExceptionIncident> {
      // Search through the list of incidents
      if (mockData.exceptionIncidents) {
        // For testing purposes, we'll try to match either id or a mock number
        const incident = mockData.exceptionIncidents.find(
          (inc) => inc.id === incidentNumber || inc.id === `exception-${incidentNumber}`
        );
        if (incident) {
          return incident;
        }
        throw new Error(`Exception incident with number ${incidentNumber} not found`);
      }

      // Default mock response
      return {
        id: `exception-${incidentNumber}`,
        name: 'Mock Exception',
        message: 'Mock exception message',
        count: 1,
        lastOccurredAt: new Date().toISOString(),
        status: 'open',
      };
    },

    async getExceptionIncidentSample(
      incidentNumber: string,
      offset = 0
    ): Promise<ExceptionIncidentSample> {
      // Try both the number directly and with exception- prefix for backward compatibility
      const key = mockData.exceptionSamples?.[incidentNumber]
        ? incidentNumber
        : `exception-${incidentNumber}`;
      if (mockData.exceptionSamples?.[key]) {
        const samples = mockData.exceptionSamples[key];
        if (offset >= samples.length) {
          throw new Error(
            `No samples found for exception incident ${incidentNumber} at offset ${offset}`
          );
        }
        return samples[offset];
      }

      // Default mock response
      return {
        id: `sample-${incidentNumber}-1`,
        timestamp: new Date().toISOString(),
        message: 'Mock exception sample',
        action: 'MockController#action',
        namespace: 'mock',
        revision: 'mock-revision',
        version: '1.0.0',
      };
    },

    async getLogIncident(incidentNumber: string): Promise<LogIncident> {
      // Check for error scenarios
      if (mockData.errorScenarios?.logIncident?.[incidentNumber]) {
        throw mockData.errorScenarios.logIncident[incidentNumber];
      }

      // Try both the number directly and with log- prefix for backward compatibility
      const key = mockData.logIncidents?.[incidentNumber]
        ? incidentNumber
        : `log-${incidentNumber}`;
      if (mockData.logIncidents?.[key]) {
        return mockData.logIncidents[key];
      }

      // Default mock response
      return {
        id: `log-${incidentNumber}`,
        number: 1,
        summary: 'Mock Log Incident',
        description: 'Mock description',
        severity: 'ERROR',
        state: 'OPEN',
        count: 1,
        createdAt: new Date().toISOString(),
        lastOccurredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        digests: [],
        trigger: {
          id: 'mock-trigger',
          name: 'Mock Trigger',
          description: 'Mock trigger description',
          query: '*',
          severities: ['ERROR'],
          sourceIds: [],
        },
      };
    },

    async searchLogs(
      query: string,
      limit = 100,
      severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>,
      _start?: string,
      _end?: string,
      _verbose?: boolean
    ): Promise<LogSearchResult> {
      // Check for error scenarios
      if (mockData.errorScenarios?.searchLogs?.[query]) {
        throw mockData.errorScenarios.searchLogs[query];
      }

      let lines: LogSearchResult['lines'] = [];

      if (mockData.searchResponses?.[query]) {
        lines = mockData.searchResponses[query];

        // Filter by severities if provided
        if (severities && severities.length > 0) {
          const severityMap = severities.map((s) => s.toUpperCase());
          lines = lines.filter((log) => severityMap.includes(log.severity));
        }

        lines = lines.slice(0, limit);
      } else {
        // Default mock behavior
        lines = [
          {
            id: 'mock-log-1',
            timestamp: new Date().toISOString(),
            message: `Mock log entry matching query: ${query}`,
            severity: 'INFO',
            hostname: 'mock-host',
            group: 'mock-group',
          },
        ];
      }

      // Create formatted summary
      let formattedSummary = `Found ${lines.length} log entries within 3600s window.\n\n`;
      if (lines.length > 0) {
        const bySeverity = lines.reduce(
          (acc, line) => {
            if (!acc[line.severity]) acc[line.severity] = 0;
            acc[line.severity]++;
            return acc;
          },
          {} as Record<string, number>
        );

        formattedSummary += 'Summary by severity:\n';
        for (const [severity, count] of Object.entries(bySeverity)) {
          formattedSummary += `- ${severity}: ${count} entries\n`;
        }
      }

      return {
        queryWindow: 3600,
        lines,
        formattedSummary,
        truncationApplied: false,
      };
    },

    async getAnomalyIncident(incidentNumber: string): Promise<AnomalyIncidentData> {
      // Check for error scenarios
      if (mockData.errorScenarios?.anomalyIncident?.[incidentNumber]) {
        const error = mockData.errorScenarios.anomalyIncident[incidentNumber];
        throw typeof error === 'string' ? new Error(error) : error;
      }

      // Try both the number directly and with anomaly- prefix for backward compatibility
      const key = mockData.anomalyIncidents?.[incidentNumber]
        ? incidentNumber
        : `anomaly-${incidentNumber}`;
      if (mockData.anomalyIncidents?.[key]) {
        return mockData.anomalyIncidents[key];
      }

      // Default mock response
      return {
        id: `anomaly-${incidentNumber}`,
        number: 1,
        summary: 'Mock Anomaly',
        description: 'Mock anomaly description',
        state: 'open',
        count: 1,
        createdAt: new Date().toISOString(),
        lastOccurredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        digests: [],
        alertState: 'OPEN',
        trigger: {
          id: 'mock-trigger',
          name: 'Mock Trigger',
          description: 'Mock trigger description',
        },
      };
    },

    async getLogIncidents(
      _states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
      _limit = 50,
      _offset = 0
    ): Promise<IncidentListResult<LogIncident>> {
      // Check for error scenarios
      if (mockData.errorScenarios?.logIncidents) {
        const error = mockData.errorScenarios.logIncidents;
        throw typeof error === 'string' ? new Error(error) : error;
      }

      if (mockData.logIncidentLists) {
        return mockData.logIncidentLists;
      }

      // Default mock response
      return {
        incidents: [
          {
            id: 'mock-log-incident-1',
            number: 1,
            summary: 'Mock Log Incident',
            state: 'OPEN',
            count: 10,
            lastOccurredAt: new Date().toISOString(),
            trigger: {
              id: 'mock-trigger',
              name: 'Mock Trigger',
              query: 'mock query',
              severities: ['ERROR'],
              sourceIds: ['source-1'],
            },
          },
        ],
        total: 1,
        hasMore: false,
      };
    },

    async getExceptionIncidents(
      _states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
      _limit = 50,
      _offset = 0
    ): Promise<IncidentListResult<ExceptionIncident>> {
      // Check for error scenarios
      if (mockData.errorScenarios?.exceptionIncidents) {
        const error = mockData.errorScenarios.exceptionIncidents;
        throw typeof error === 'string' ? new Error(error) : error;
      }

      if (mockData.exceptionIncidentLists) {
        return mockData.exceptionIncidentLists;
      }

      // Default mock response
      return {
        incidents: [
          {
            id: 'mock-exception-1',
            name: 'MockException',
            message: 'Mock exception message',
            count: 5,
            lastOccurredAt: new Date().toISOString(),
            status: 'open',
          },
        ],
        total: 1,
        hasMore: false,
      };
    },

    async getAnomalyIncidents(
      _states: Array<'OPEN' | 'CLOSED' | 'WIP'> = ['OPEN'],
      _limit = 50,
      _offset = 0
    ): Promise<IncidentListResult<AnomalyIncidentData>> {
      // Check for error scenarios
      if (mockData.errorScenarios?.anomalyIncidents) {
        const error = mockData.errorScenarios.anomalyIncidents;
        throw typeof error === 'string' ? new Error(error) : error;
      }

      if (mockData.anomalyIncidentLists) {
        return mockData.anomalyIncidentLists;
      }

      // Default mock response
      return {
        incidents: [
          {
            id: 'mock-anomaly-1',
            number: 1,
            summary: 'Mock Anomaly',
            state: 'open',
            count: 3,
            lastOccurredAt: new Date().toISOString(),
          },
        ],
        total: 1,
        hasMore: false,
      };
    },

    async getPerformanceIncidents(
      states?: Array<'open' | 'closed' | 'wip'>,
      _limit?: number,
      _offset?: number
    ): Promise<IncidentListResult<PerformanceIncident>> {
      // Check for error scenarios
      if (mockData.errorScenarios?.performanceIncidents) {
        const error = mockData.errorScenarios.performanceIncidents;
        throw new Error(typeof error === 'string' ? error : error.message);
      }

      // Use mock data if provided
      if (mockData.performanceIncidents) {
        const filteredIncidents = mockData.performanceIncidents.filter(
          (inc) => !states || states.length === 0 || (states as string[]).includes(inc.state)
        );
        return {
          incidents: filteredIncidents,
          total: filteredIncidents.length,
          hasMore: false,
        };
      }

      // Default response
      return {
        incidents: [
          {
            id: 'perf-123',
            number: '42',
            state: 'OPEN',
            severity: 'high',
            actionNames: ['UsersController#show'],
            namespace: 'web',
            mean: 1234.5,
            count: 100,
            scopedCount: 90,
            totalDuration: 123450,
            description: 'Slow database query',
            digests: ['abc123'],
            hasNPlusOne: true,
            hasSamplesInRetention: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastOccurredAt: '2024-01-15T00:00:00Z',
            lastSampleOccurredAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      };
    },

    async getPerformanceIncident(incidentNumber: string): Promise<PerformanceIncident> {
      // Check mock data first
      if (mockData.performanceIncidents) {
        const incident = mockData.performanceIncidents.find((inc) => inc.number === incidentNumber);
        if (incident) {
          return incident;
        }
      }
      // Legacy check for backward compatibility
      if (incidentNumber === '42' || incidentNumber === 'perf-123') {
        return {
          id: 'perf-123',
          number: '42',
          state: 'OPEN',
          severity: 'high',
          actionNames: ['UsersController#show'],
          namespace: 'web',
          mean: 1234.5,
          count: 100,
          scopedCount: 90,
          totalDuration: 123450,
          description: 'Slow database query',
          digests: ['abc123'],
          hasNPlusOne: true,
          hasSamplesInRetention: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastOccurredAt: '2024-01-15T00:00:00Z',
          lastSampleOccurredAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        };
      }
      throw new Error(`Performance incident with number ${incidentNumber} not found`);
    },

    async getPerformanceIncidentSample(incidentNumber: string): Promise<PerformanceIncidentSample> {
      // Legacy check for backward compatibility
      if (incidentNumber === '42' || incidentNumber === 'perf-123') {
        return {
          id: 'sample-789',
          time: '2024-01-15T00:00:00Z',
          action: 'UsersController#show',
          duration: 1523.4,
          queueDuration: 45.2,
          namespace: 'web',
          revision: 'abc123',
          version: '1.0.0',
          originalId: 'req-123',
          originallyRequested: true,
          hasNPlusOne: true,
          timelineTruncatedEvents: 0,
          createdAt: '2024-01-15T00:00:00Z',
          customData: { user_id: '123' },
          params: { id: '42' },
          sessionData: { ip: '127.0.0.1' },
        };
      }
      throw new Error(`No sample found for performance incident with number ${incidentNumber}`);
    },

    async getPerformanceIncidentSampleTimeline(
      incidentNumber: string
    ): Promise<PerformanceIncidentSampleTimeline> {
      // Check for mock data
      // Try both the number directly and with perf- prefix for backward compatibility
      const key = mockData.performanceTimelineData?.[incidentNumber]
        ? incidentNumber
        : `perf-${incidentNumber}`;
      if (mockData.performanceTimelineData?.[key]) {
        return mockData.performanceTimelineData[key];
      }

      // Legacy check for backward compatibility
      if (incidentNumber === '42' || incidentNumber === 'perf-123') {
        return {
          sampleId: 'sample-789',
          timeline: [
            {
              name: 'process_action.action_controller',
              action: 'UsersController#show',
              digest: 'abc123',
              group: 'action_controller',
              level: 0,
              duration: 1523.4,
              childDuration: 1450.2,
              allocationCount: 15000,
              childAllocationCount: 14500,
              count: 1,
              time: 0,
              end: 1523.4,
              wrapping: false,
              payload: { name: 'UsersController#show' },
            },
          ],
        };
      }
      throw new Error(`No sample found for performance incident with number ${incidentNumber}`);
    },

    async getSlowRequests(
      namespace: string | null = null,
      _incidentLimit = 5,
      samplesPerIncident = 3
    ): Promise<SlowRequestsResult> {
      // Return mock slow requests data
      return {
        incidents: [
          {
            number: 42,
            actionNames: ['UsersController#show'],
            mean: 1234.5,
            count: 523,
            hasNPlusOne: true,
            namespace: namespace || 'web',
            samples: Array(Math.min(samplesPerIncident, 3))
              .fill(null)
              .map((_, idx) => ({
                id: `sample-${idx + 1}`,
                time: new Date().toISOString(),
                action: 'UsersController#show',
                duration: 2500 + idx * 100,
                queueDuration: 10,
                hasNPlusOne: true,
                params: '{"id":"456"}',
                overview: [
                  { key: 'method', value: 'GET' },
                  { key: 'path', value: '/users/456' },
                  { key: 'format', value: 'html' },
                ],
                groupDurations: [
                  { key: 'active_record', value: 1800 },
                  { key: 'action_view', value: 650 },
                  { key: 'action_controller', value: 50 },
                ],
              })),
          },
        ],
      };
    },

    async getDeployMarkers(
      _timeframe: TimeframeEnum = 'R7D',
      _limit = 10
    ): Promise<DeployMarker[]> {
      return [
        {
          id: 'deploy-1',
          revision: 'abc123def456',
          shortRevision: 'abc123d',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: 'deployer@example.com',
          exceptionCount: 5,
        },
        {
          id: 'deploy-2',
          revision: 'def456ghi789',
          shortRevision: 'def456g',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          user: 'deployer@example.com',
          exceptionCount: 2,
        },
      ];
    },

    async getMetrics(
      metricName: string,
      namespace: string,
      _timeframe: TimeframeEnum = 'R24H',
      _limit = 100
    ): Promise<MetricsResult> {
      return {
        start: new Date(Date.now() - 86400000).toISOString(),
        end: new Date().toISOString(),
        total: 100,
        rows: [
          {
            id: 'metric-1',
            name: metricName,
            tags: [
              { key: 'namespace', value: namespace },
              { key: 'host', value: 'web-1' },
            ],
            fields: [
              { key: 'mean', value: 123.45 },
              { key: 'count', value: 1000 },
            ],
          },
        ],
      };
    },

    async getPerformanceSamples(actionName: string, limit = 10): Promise<PerformanceSamplesResult> {
      return {
        incidentNumber: 42,
        actionNames: [actionName],
        mean: 1234.5,
        samples: Array(Math.min(limit, 3))
          .fill(null)
          .map((_, idx) => ({
            id: `sample-${idx + 1}`,
            time: new Date().toISOString(),
            action: 'UsersController#show',
            duration: 2500 + idx * 100,
            queueDuration: 10,
            hasNPlusOne: true,
            params: '{"id":"456"}',
            overview: [
              { key: 'method', value: 'GET' },
              { key: 'path', value: '/users/456' },
            ],
            groupDurations: [
              { key: 'active_record', value: 1800 },
              { key: 'action_view', value: 650 },
            ],
          })),
      };
    },

    async getMetricsTimeseries(
      metricName: string,
      namespace: string,
      _timeframe: TimeframeEnum = 'R1H'
    ): Promise<TimeseriesResult> {
      const now = Date.now();
      return {
        resolution: '1m',
        start: new Date(now - 3600000).toISOString(),
        end: new Date(now).toISOString(),
        keys: [
          {
            name: metricName,
            fields: ['mean', 'p95'],
            tags: [{ key: 'namespace', value: namespace }],
          },
        ],
        points: Array(60)
          .fill(null)
          .map((_, idx) => ({
            timestamp: now - (60 - idx) * 60000,
            values: [
              { key: 'mean', value: 100 + Math.random() * 50 },
              { key: 'p95', value: 150 + Math.random() * 100 },
            ],
          })),
      };
    },
  };

  return client;
}
