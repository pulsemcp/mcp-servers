import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogEntry,
} from './appsignal-client.js';

interface MockData {
  exceptionIncidents?: Record<string, ExceptionIncident>;
  exceptionIncidentSamples?: Record<string, ExceptionIncidentSample[]>;
  logIncidents?: Record<string, LogIncident>;
  searchResponses?: Record<string, LogEntry[]>;
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
      if (mockData.exceptionIncidents?.[incidentId]) {
        return mockData.exceptionIncidents[incidentId];
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

    async getExceptionIncidentSamples(
      incidentId: string,
      limit = 10
    ): Promise<ExceptionIncidentSample[]> {
      if (mockData.exceptionIncidentSamples?.[incidentId]) {
        return mockData.exceptionIncidentSamples[incidentId].slice(0, limit);
      }

      // Default mock response
      return [
        {
          id: `sample-${incidentId}-1`,
          timestamp: new Date().toISOString(),
          message: 'Mock exception sample',
          backtrace: ['mock.js:1', 'mock.js:2'],
          metadata: { incidentId },
        },
      ];
    },

    async getLogIncident(incidentId: string): Promise<LogIncident> {
      if (mockData.logIncidents?.[incidentId]) {
        return mockData.logIncidents[incidentId];
      }

      // Default mock response
      return {
        id: incidentId,
        name: 'Mock Log Incident',
        severity: 'error',
        count: 1,
        lastOccurredAt: new Date().toISOString(),
        status: 'open',
      };
    },

    async searchLogs(query: string, limit = 100, offset = 0): Promise<LogEntry[]> {
      if (mockData.searchResponses?.[query]) {
        return mockData.searchResponses[query].slice(offset, offset + limit);
      }

      // Default mock behavior
      return [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Mock log entry matching query: ${query}`,
          metadata: { query },
        },
      ];
    },
  };

  return client;
}
