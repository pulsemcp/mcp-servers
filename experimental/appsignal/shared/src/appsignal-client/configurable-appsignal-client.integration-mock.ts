/**
 * Configurable mock implementation of IAppsignalClient for integration tests.
 * This mock reads configuration from environment variables to provide custom responses.
 * Used by the integration test server (index.integration.ts) to simulate different scenarios.
 */
import type { IAppsignalClient, Alert, LogEntry } from './appsignal-client.js';

interface MockConfig {
  getAlertDetails?: Record<string, Alert | Error>;
  searchLogs?: Array<{
    query: string;
    response: LogEntry[] | Error;
  }>;
  getLogsInDatetimeRange?: Array<{
    start: string;
    end: string;
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
    async getAlertDetails(alertId: string): Promise<Alert> {
      const config = getMockConfig();
      
      if (config.getAlertDetails?.[alertId]) {
        const response = config.getAlertDetails[alertId];
        if (response instanceof Error) {
          throw response;
        }
        return response;
      }

      // Default mock response
      return {
        id: alertId,
        status: 'active',
        triggers: [
          {
            timestamp: new Date().toISOString(),
            message: 'Default mock alert trigger',
          },
        ],
        affectedServices: ['mock-service'],
      };
    },

    async searchLogs(query: string, limit = 100, offset = 0): Promise<LogEntry[]> {
      const config = getMockConfig();
      
      // Find matching mock response
      const mockResponse = config.searchLogs?.find(m => m.query === query);
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

    async getLogsInDatetimeRange(startTime: string, endTime: string, limit = 100): Promise<LogEntry[]> {
      const config = getMockConfig();
      
      // Find matching mock response
      const mockResponse = config.getLogsInDatetimeRange?.find(
        m => m.start === startTime && m.end === endTime
      );
      if (mockResponse) {
        if (mockResponse.response instanceof Error) {
          throw mockResponse.response;
        }
        return mockResponse.response.slice(0, limit);
      }

      // Default mock response
      return [
        {
          timestamp: startTime,
          level: 'info',
          message: `Mock logs from ${startTime} to ${endTime}`,
          metadata: { range: { start: startTime, end: endTime } },
        },
      ];
    },
  };
}