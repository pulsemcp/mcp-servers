import { vi } from 'vitest';
import type { IAppsignalClient, Alert, LogEntry } from '../../shared/src/appsignal-client';

export function createMockAppsignalClient(): IAppsignalClient {
  return {
    getAlertDetails: vi.fn(),
    searchLogs: vi.fn(),
    getLogsInDatetimeRange: vi.fn(),
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