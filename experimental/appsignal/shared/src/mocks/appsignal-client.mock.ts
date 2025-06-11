import type { IAppsignalClient, Alert, LogEntry } from '../appsignal-client.js';

export function createMockAppsignalClient(): IAppsignalClient {
  return {
    async getAlertDetails(alertId: string): Promise<Alert> {
      return {
        id: alertId,
        status: 'active',
        triggers: [
          {
            timestamp: '2024-01-15T10:30:00Z',
            message: 'High error rate detected',
          },
        ],
        affectedServices: ['api-service', 'web-service'],
      };
    },
    
    async searchLogs(query: string, limit = 100, offset = 0): Promise<LogEntry[]> {
      const allLogs: LogEntry[] = [
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
        {
          timestamp: '2024-01-15T10:10:00Z',
          level: 'info',
          message: 'Service started successfully',
          metadata: {
            service: 'api-service',
          },
        },
      ];
      
      // Simple mock filtering - also match on level
      const filteredLogs = allLogs.filter(log => 
        log.message.toLowerCase().includes(query.toLowerCase()) ||
        log.level.toLowerCase().includes(query.toLowerCase())
      );
      
      return filteredLogs.slice(offset, offset + limit);
    },
    
    async getLogsInDatetimeRange(startTime: string, endTime: string, limit = 100): Promise<LogEntry[]> {
      const logs: LogEntry[] = [
        {
          timestamp: startTime,
          level: 'info',
          message: `Logs from ${startTime} to ${endTime}`,
          metadata: {
            range: { start: startTime, end: endTime },
          },
        },
      ];
      
      return logs.slice(0, limit);
    },
  };
}