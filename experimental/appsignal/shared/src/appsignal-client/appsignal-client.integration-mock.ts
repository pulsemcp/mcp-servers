import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogEntry,
} from './appsignal-client.js';

interface MockData {
  exceptionIncidents?: ExceptionIncident[];
  exceptionSamples?: Record<string, ExceptionIncidentSample[]>;
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
