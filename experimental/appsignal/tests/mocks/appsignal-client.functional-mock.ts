import { vi } from 'vitest';
import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
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
    getExceptionIncidentSample: vi
      .fn()
      .mockImplementation(async (incidentId: string, offset = 0) => ({
        id: `sample-${incidentId}-${offset + 1}`,
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Cannot read property "id" of null',
        backtrace: ['at Object.getUserId (app.js:123:45)', 'at processRequest (app.js:45:12)'],
        action: 'UserController#show',
        namespace: 'web',
        revision: 'abc123',
        version: '1.0.0',
        params: { userId: null, requestId: 'req-123' },
      })),
    getLogIncident: vi.fn().mockImplementation(async (incidentId: string) => ({
      id: incidentId,
      number: 123,
      summary: 'High Error Rate',
      description: 'Error rate exceeded threshold',
      severity: 'ERROR',
      state: 'OPEN',
      count: 156,
      createdAt: '2024-01-15T09:00:00Z',
      lastOccurredAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      digests: ['digest1', 'digest2'],
      trigger: {
        id: 'trigger-123',
        name: 'High Error Rate Trigger',
        description: 'Monitors error rates',
        query: 'level:error service:api',
        severities: ['ERROR', 'FATAL'],
        sourceIds: ['source1', 'source2'],
      },
      logLine: {
        id: 'log-line-123',
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Database connection failed',
        severity: 'ERROR',
        hostname: 'api-server-01',
        group: 'api-service',
        attributes: [
          { key: 'service', value: 'api' },
          { key: 'error_code', value: 'DB_ERROR' },
        ],
      },
    })),
    searchLogs: vi.fn().mockImplementation(async (query: string) => {
      const lines = query.includes('error')
        ? [
            {
              id: 'log-1',
              timestamp: '2024-01-15T10:00:00Z',
              message: 'Database connection failed',
              severity: 'ERROR',
              hostname: 'api-server-01',
              group: 'api-service',
              attributes: [
                { key: 'service', value: 'api-service' },
                { key: 'errorCode', value: 'DB_CONNECTION_ERROR' },
              ],
            },
          ]
        : [];

      return {
        queryWindow: 3600,
        lines,
        formattedSummary: `Found ${lines.length} log entries within 3600s window.\n\n${
          lines.length > 0
            ? 'Summary by severity:\n- ERROR: 1 entries\n\nRecent log samples:\n1. [2024-01-15T10:00:00Z] ERROR - Database connection failed (host: api-server-01) (group: api-service) (service=api-service, errorCode=DB_CONNECTION_ERROR)\n'
            : ''
        }`,
      };
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

export const mockExceptionIncidentSample: ExceptionIncidentSample = {
  id: 'sample-1',
  timestamp: '2024-01-15T10:30:00Z',
  message: 'Cannot read property "id" of null',
  backtrace: ['at Object.getUserId (app.js:123:45)', 'at processRequest (app.js:45:12)'],
  action: 'UserController#show',
  namespace: 'web',
  revision: 'abc123',
  version: '1.0.0',
  params: { userId: null, requestId: 'req-123' },
};

export const mockLogIncident: LogIncident = {
  id: 'log-123',
  number: 123,
  summary: 'High Error Rate',
  description: 'Error rate exceeded threshold',
  severity: 'ERROR',
  state: 'OPEN',
  count: 156,
  createdAt: '2024-01-15T09:00:00Z',
  lastOccurredAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  digests: ['digest1', 'digest2'],
  trigger: {
    id: 'trigger-123',
    name: 'High Error Rate Trigger',
    description: 'Monitors error rates',
    query: 'level:error service:api',
    severities: ['ERROR', 'FATAL'],
    sourceIds: ['source1', 'source2'],
  },
  logLine: {
    id: 'log-line-123',
    timestamp: '2024-01-15T10:30:00Z',
    message: 'Database connection failed',
    severity: 'ERROR',
    hostname: 'api-server-01',
    group: 'api-service',
    attributes: [
      { key: 'service', value: 'api' },
      { key: 'error_code', value: 'DB_ERROR' },
    ],
  },
};

export const mockLogSearchResult: LogSearchResult = {
  queryWindow: 3600,
  lines: [
    {
      id: 'log-1',
      timestamp: '2024-01-15T10:00:00Z',
      message: 'Database connection failed',
      severity: 'ERROR',
      hostname: 'api-server-01',
      group: 'api-service',
      attributes: [
        { key: 'service', value: 'api-service' },
        { key: 'errorCode', value: 'DB_CONNECTION_ERROR' },
      ],
    },
    {
      id: 'log-2',
      timestamp: '2024-01-15T10:05:00Z',
      message: 'High memory usage detected',
      severity: 'WARN',
      hostname: 'web-server-01',
      group: 'web-service',
      attributes: [
        { key: 'service', value: 'web-service' },
        { key: 'memoryUsage', value: '0.85' },
      ],
    },
  ],
  formattedSummary:
    'Found 2 log entries within 3600s window.\n\nSummary by severity:\n- ERROR: 1 entries\n- WARN: 1 entries\n\nRecent log samples:\n1. [2024-01-15T10:00:00Z] ERROR - Database connection failed (host: api-server-01) (group: api-service) (service=api-service, errorCode=DB_CONNECTION_ERROR)\n2. [2024-01-15T10:05:00Z] WARN - High memory usage detected (host: web-server-01) (group: web-service) (service=web-service, memoryUsage=0.85)\n',
};
