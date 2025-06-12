import { vi } from 'vitest';
import type { IAppsignalClient, Alert, LogEntry } from '../../shared/src/appsignal-client';

/**
 * Creates a vitest mock implementation of IAppsignalClient for functional tests.
 * This provides default mock behaviors that can be overridden in individual tests.
 * Used when testing individual functions/tools in isolation.
 */
export function createMockAppsignalClient(): IAppsignalClient {
  return {
    getAlertDetails: vi.fn().mockImplementation(async (alertId: string) => ({
      id: alertId,
      status: 'active',
      triggers: [
        {
          timestamp: '2024-01-15T10:30:00Z',
          message: 'High error rate detected',
        },
      ],
      affectedServices: ['api-service', 'web-service'],
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
    getLogsInDatetimeRange: vi.fn().mockImplementation(async (start: string, end: string) => [
      {
        timestamp: start,
        level: 'info',
        message: `Logs from ${start} to ${end}`,
        metadata: { range: { start, end } },
      },
    ]),
  };
}

// Mock data factories
export const mockAlert: Alert = {
  id: 'alert-123',
  status: 'active',
  triggers: [
    {
      timestamp: '2024-01-15T10:30:00Z',
      message: 'High error rate detected',
    },
  ],
  affectedServices: ['api-service', 'web-service'],
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