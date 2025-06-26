import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
} from './appsignal-client.js';

interface MockData {
  exceptionIncidents?: ExceptionIncident[];
  exceptionSamples?: Record<string, ExceptionIncidentSample[]>;
  logIncidents?: Record<string, LogIncident>;
  searchResponses?: Record<string, LogSearchResult['lines']>;
  errorScenarios?: {
    logIncident?: Record<string, Error>;
    searchLogs?: Record<string, Error>;
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

    async getExceptionIncident(incidentId: string): Promise<ExceptionIncident> {
      // Search through the list of incidents
      if (mockData.exceptionIncidents) {
        const incident = mockData.exceptionIncidents.find((inc) => inc.id === incidentId);
        if (incident) {
          return incident;
        }
        throw new Error(`Exception incident with ID ${incidentId} not found`);
      }

      // Default mock response
      return {
        id: incidentId,
        name: 'Mock Exception',
        message: 'Mock exception message',
        count: 1,
        lastOccurredAt: new Date().toISOString(),
        status: 'open',
      };
    },

    async getExceptionIncidentSample(
      incidentId: string,
      offset = 0
    ): Promise<ExceptionIncidentSample> {
      if (mockData.exceptionSamples?.[incidentId]) {
        const samples = mockData.exceptionSamples[incidentId];
        if (offset >= samples.length) {
          throw new Error(
            `No samples found for exception incident ${incidentId} at offset ${offset}`
          );
        }
        return samples[offset];
      }

      // Default mock response
      return {
        id: `sample-${incidentId}-1`,
        timestamp: new Date().toISOString(),
        message: 'Mock exception sample',
        backtrace: ['mock.js:1', 'mock.js:2'],
        action: 'MockController#action',
        namespace: 'mock',
        revision: 'mock-revision',
        version: '1.0.0',
      };
    },

    async getLogIncident(incidentId: string): Promise<LogIncident> {
      // Check for error scenarios
      if (mockData.errorScenarios?.logIncident?.[incidentId]) {
        throw mockData.errorScenarios.logIncident[incidentId];
      }

      if (mockData.logIncidents?.[incidentId]) {
        return mockData.logIncidents[incidentId];
      }

      // Default mock response
      return {
        id: incidentId,
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
      severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>
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
      };
    },
  };

  return client;
}
