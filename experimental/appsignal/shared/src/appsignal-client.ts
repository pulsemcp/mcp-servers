// AppSignal API client interface
export interface Alert {
  id: string;
  status: 'active' | 'resolved' | 'muted';
  triggers: Array<{
    timestamp: string;
    message: string;
  }>;
  affectedServices: string[];
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface IAppsignalClient {
  getAlertDetails(alertId: string): Promise<Alert>;
  searchLogs(query: string, limit?: number, offset?: number): Promise<LogEntry[]>;
  getLogsInDatetimeRange(startTime: string, endTime: string, limit?: number): Promise<LogEntry[]>;
}

// Stub implementation for now
export class AppsignalClient implements IAppsignalClient {
  constructor(private apiKey: string, private appId: string) {}

  async getAlertDetails(alertId: string): Promise<Alert> {
    // TODO: Implement actual API call
    throw new Error('Not implemented');
  }

  async searchLogs(query: string, limit = 100, offset = 0): Promise<LogEntry[]> {
    // TODO: Implement actual API call
    throw new Error('Not implemented');
  }

  async getLogsInDatetimeRange(startTime: string, endTime: string, limit = 100): Promise<LogEntry[]> {
    // TODO: Implement actual API call
    throw new Error('Not implemented');
  }
}