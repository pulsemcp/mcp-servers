import { vi } from 'vitest';
import type {
  IAppsignalClient,
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogSearchResult,
  AnomalyIncidentData,
  IncidentListResult,
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
    getExceptionIncident: vi.fn().mockImplementation(async (incidentNumber: string) => ({
      id: incidentNumber,
      name: 'NullPointerException',
      message: 'Cannot read property "id" of null',
      count: 42,
      lastOccurredAt: '2024-01-15T10:30:00Z',
      status: 'open',
    })),
    getExceptionIncidentSample: vi
      .fn()
      .mockImplementation(async (incidentNumber: string, offset = 0) => ({
        id: `sample-${incidentNumber}-${offset + 1}`,
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Cannot read property "id" of null',
        action: 'UserController#show',
        namespace: 'web',
        revision: 'abc123',
        version: '1.0.0',
        params: { userId: null, requestId: 'req-123' },
      })),
    getLogIncident: vi.fn().mockImplementation(async (incidentNumber: string) => ({
      id: incidentNumber,
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
            },
          ]
        : [];

      return {
        queryWindow: 3600,
        lines,
        formattedSummary: `Found ${lines.length} log entries within 3600s window.\n\n${
          lines.length > 0
            ? 'Summary by severity:\n- ERROR: 1 entries\n\nRecent log samples:\n1. [2024-01-15T10:00:00Z] ERROR - Database connection failed (host: api-server-01) (group: api-service)\n'
            : ''
        }`,
        truncationApplied: false,
      };
    }),
    getAnomalyIncident: vi.fn().mockImplementation(async (incidentNumber: string) => ({
      id: incidentNumber,
      number: 45,
      summary: 'High CPU usage detected',
      description: 'CPU usage exceeded 90% threshold',
      state: 'open',
      count: 12,
      createdAt: '2024-01-15T08:00:00Z',
      lastOccurredAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      digests: ['digest1', 'digest2'],
      alertState: 'OPEN',
      trigger: {
        id: 'trigger-123',
        name: 'CPU Monitor',
        description: 'Monitors CPU usage',
      },
      tags: [
        { key: 'environment', value: 'production' },
        { key: 'severity', value: 'high' },
      ],
    })),
    getLogIncidents: vi.fn().mockImplementation(async () => ({
      incidents: [
        {
          id: 'log-1',
          number: 101,
          summary: 'Database connection errors',
          state: 'open',
          count: 25,
          lastOccurredAt: '2024-01-15T10:00:00Z',
        },
      ],
      total: 1,
      hasMore: false,
    })),
    getExceptionIncidents: vi.fn().mockImplementation(async () => ({
      incidents: [
        {
          id: 'exc-1',
          name: 'NullPointerException',
          message: 'Cannot read property x of null',
          count: 42,
          lastOccurredAt: '2024-01-15T10:00:00Z',
          status: 'open',
        },
      ],
      total: 1,
      hasMore: false,
    })),
    getAnomalyIncidents: vi.fn().mockImplementation(async () => ({
      incidents: [
        {
          id: 'anomaly-1',
          number: 1,
          summary: 'Memory spike',
          state: 'open',
          count: 5,
          lastOccurredAt: '2024-01-15T10:00:00Z',
        },
      ],
      total: 1,
      hasMore: false,
    })),
    getPerformanceIncidents: vi.fn().mockImplementation(async () => ({
      incidents: [
        {
          id: 'perf-123',
          number: '42',
          state: 'open',
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
    })),
    getPerformanceIncident: vi.fn().mockImplementation(async (incidentNumber: string) => {
      if (incidentNumber === 'perf-123') {
        return {
          id: 'perf-123',
          number: '42',
          state: 'open',
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
      throw new Error(`Performance incident ${incidentNumber} not found`);
    }),
    getPerformanceIncidentSample: vi.fn().mockImplementation(async (incidentNumber: string) => {
      if (incidentNumber === 'perf-123') {
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
      throw new Error(`No sample found for performance incident ${incidentNumber}`);
    }),
    getPerformanceIncidentSampleTimeline: vi
      .fn()
      .mockImplementation(async (incidentNumber: string) => {
        if (incidentNumber === 'perf-123') {
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
        throw new Error(`No sample found for performance incident ${incidentNumber}`);
      }),
    // Custom GraphQL query execution
    executeCustomQuery: vi.fn().mockImplementation(async () => ({
      viewer: {
        organizations: [
          {
            apps: [{ id: 'test-app-id', name: 'Test App' }],
          },
        ],
      },
    })),
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
    },
    {
      id: 'log-2',
      timestamp: '2024-01-15T10:05:00Z',
      message: 'High memory usage detected',
      severity: 'WARN',
      hostname: 'web-server-01',
      group: 'web-service',
    },
  ],
  formattedSummary:
    'Found 2 log entries within 3600s window.\n\nSummary by severity:\n- ERROR: 1 entries\n- WARN: 1 entries\n\nRecent log samples:\n1. [2024-01-15T10:00:00Z] ERROR - Database connection failed (host: api-server-01) (group: api-service)\n2. [2024-01-15T10:05:00Z] WARN - High memory usage detected (host: web-server-01) (group: web-service)\n',
  truncationApplied: false,
};

export const mockAnomalyIncident: AnomalyIncidentData = {
  id: 'anomaly-123',
  number: 45,
  summary: 'High CPU usage detected',
  description: 'CPU usage exceeded 90% threshold',
  state: 'open',
  count: 12,
  createdAt: '2024-01-15T08:00:00Z',
  lastOccurredAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  digests: ['digest1', 'digest2'],
  alertState: 'OPEN',
  trigger: {
    id: 'trigger-123',
    name: 'CPU Monitor',
    description: 'Monitors CPU usage',
  },
  tags: [
    { key: 'environment', value: 'production' },
    { key: 'severity', value: 'high' },
  ],
};

export const mockLogIncidentList: IncidentListResult<LogIncident> = {
  incidents: [
    {
      id: 'log-1',
      number: 101,
      summary: 'Database connection errors',
      description: 'Multiple failed DB connections',
      severity: 'error',
      state: 'open',
      count: 25,
      createdAt: '2024-01-15T08:00:00Z',
      lastOccurredAt: '2024-01-15T10:00:00Z',
      trigger: {
        id: 'trigger-1',
        name: 'DB Error Monitor',
        query: 'level:error source:database',
        severities: ['error', 'fatal'],
        sourceIds: ['app-server-1'],
      },
    },
  ],
  total: 1,
  hasMore: false,
};

export const mockExceptionIncidentList: IncidentListResult<ExceptionIncident> = {
  incidents: [
    {
      id: 'exc-1',
      name: 'NullPointerException',
      message: 'Cannot read property x of null',
      count: 42,
      lastOccurredAt: '2024-01-15T10:00:00Z',
      status: 'open',
    },
  ],
  total: 1,
  hasMore: false,
};

export const mockAnomalyIncidentList: IncidentListResult<AnomalyIncidentData> = {
  incidents: [
    {
      id: 'anomaly-1',
      number: 1,
      summary: 'Memory spike',
      state: 'open',
      count: 5,
      lastOccurredAt: '2024-01-15T10:00:00Z',
    },
  ],
  total: 1,
  hasMore: false,
};
