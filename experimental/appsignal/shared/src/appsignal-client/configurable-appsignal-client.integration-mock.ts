/**
 * Configurable mock implementation of IAppsignalClient for integration tests.
 * This mock reads configuration from environment variables to provide custom responses.
 * Used by the integration test server (index.integration.ts) to simulate different scenarios.
 */
import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogEntry,
} from './appsignal-client.js';

interface MockConfig {
  getExceptionIncident?: Record<string, ExceptionIncident | Error>;
  getExceptionIncidentSamples?: Record<string, ExceptionIncidentSample[] | Error>;
  getLogIncident?: Record<string, LogIncident | Error>;
  searchLogs?: Array<{
    query: string;
    response: LogEntry[] | Error;
  }>;
}

export function createConfigurableAppsignalClient(): IAppsignalClient {
  // Load mock configuration from environment variable
  const getMockConfig = (): MockConfig => {
    if (process.env.APPSIGNAL_MOCK_CONFIG) {
      try {
        return JSON.parse(process.env.APPSIGNAL_MOCK_CONFIG);
      } catch (e) {
        console.error('Failed to parse APPSIGNAL_MOCK_CONFIG:', e);
      }
    }
    return {};
  };

  return {
    async getExceptionIncident(incidentId: string): Promise<ExceptionIncident> {
      const config = getMockConfig();

      if (config.getExceptionIncident?.[incidentId]) {
        const response = config.getExceptionIncident[incidentId];
        if (response instanceof Error) {
          throw response;
        }
        return response;
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
      const config = getMockConfig();

      if (config.getExceptionIncidentSamples?.[incidentId]) {
        const response = config.getExceptionIncidentSamples[incidentId];
        if (response instanceof Error) {
          throw response;
        }
        return response.slice(0, limit);
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
      const config = getMockConfig();

      if (config.getLogIncident?.[incidentId]) {
        const response = config.getLogIncident[incidentId];
        if (response instanceof Error) {
          throw response;
        }
        return response;
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
      const config = getMockConfig();

      // Find matching mock response
      const mockResponse = config.searchLogs?.find((m) => m.query === query);
      if (mockResponse) {
        if (mockResponse.response instanceof Error) {
          throw mockResponse.response;
        }
        return mockResponse.response.slice(offset, offset + limit);
      }

      // Default mock behavior
      const defaultLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Mock log entry matching query: ${query}`,
          metadata: { query },
        },
      ];

      return defaultLogs;
    },
  };
}
