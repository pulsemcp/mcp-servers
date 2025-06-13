import { vi } from 'vitest';
import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogEntry,
} from '../../shared/src/appsignal-client/appsignal-client.js';

/**
 * Creates a vitest mock implementation of IAppsignalClient for functional tests.
 * This provides default mock behaviors that can be overridden in individual tests.
 * Used when testing individual functions/tools in isolation.
 */
export function createMockAppsignalClient(): IAppsignalClient {
  return {
    getApps: vi.fn().mockImplementation(async () => [
      { id: 'app-1', name: 'Production App', environment: 'production' },
      { id: 'app-2', name: 'Staging App', environment: 'staging' },
      { id: 'app-3', name: 'Development App', environment: 'development' },
    ]),
    getExceptionIncident: vi.fn().mockImplementation(async (incidentId: string) => ({
      id: incidentId,
      name: 'NullPointerException',
      message: 'Cannot read property "id" of null',
      count: 42,
      lastOccurredAt: '2024-01-15T10:30:00Z',
      status: 'open',
    })),
    getExceptionIncidentSamples: vi
      .fn()
      .mockImplementation(async (incidentId: string, _limit = 10) => [
        {
          id: `sample-${incidentId}-1`,
          timestamp: '2024-01-15T10:30:00Z',
          message: 'Cannot read property "id" of null',
          backtrace: ['at Object.getUserId (app.js:123:45)', 'at processRequest (app.js:45:12)'],
          metadata: { userId: null, requestId: 'req-123' },
        },
      ]),
    getLogIncident: vi.fn().mockImplementation(async (incidentId: string) => ({
      id: incidentId,
      name: 'High Error Rate',
      severity: 'error',
      count: 156,
      lastOccurredAt: '2024-01-15T10:30:00Z',
      status: 'open',
      query: 'level:error service:api',
    })),
    searchLogs: vi.fn().mockImplementation(async (query: string) => {
      if (query.includes('error')) {
        return [
          {
            timestamp: '2024-01-15T10:00:00Z',
            level: 'error',
            message: 'Database connection failed',
            metadata: {
              service: 'api-service',
              errorCode: 'DB_CONNECTION_ERROR',
            },
          },
        ];
      }
      return [];
    }),
  };
}

// Mock data factories
export const mockExceptionIncident: ExceptionIncident = {
  id: 'exception-123',
  name: 'NullPointerException',
  message: 'Cannot read property "id" of null',
  count: 42,
  lastOccurredAt: '2024-01-15T10:30:00Z',
  status: 'open',
};

export const mockExceptionIncidentSamples: ExceptionIncidentSample[] = [
  {
    id: 'sample-1',
    timestamp: '2024-01-15T10:30:00Z',
    message: 'Cannot read property "id" of null',
    backtrace: ['at Object.getUserId (app.js:123:45)', 'at processRequest (app.js:45:12)'],
    metadata: { userId: null, requestId: 'req-123' },
  },
];

export const mockLogIncident: LogIncident = {
  id: 'log-123',
  name: 'High Error Rate',
  severity: 'error',
  count: 156,
  lastOccurredAt: '2024-01-15T10:30:00Z',
  status: 'open',
  query: 'level:error service:api',
};

export const mockLogEntries: LogEntry[] = [
  {
    timestamp: '2024-01-15T10:00:00Z',
    level: 'error',
    message: 'Database connection failed',
    metadata: {
      service: 'api-service',
      errorCode: 'DB_CONNECTION_ERROR',
    },
  },
  {
    timestamp: '2024-01-15T10:05:00Z',
    level: 'warn',
    message: 'High memory usage detected',
    metadata: {
      service: 'web-service',
      memoryUsage: 0.85,
    },
  },
];
