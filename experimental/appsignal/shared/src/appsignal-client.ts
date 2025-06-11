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

  async getAlertDetails(_alertId: string): Promise<Alert> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async searchLogs(_query: string, _limit = 100, _offset = 0): Promise<LogEntry[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async getLogsInDatetimeRange(_startTime: string, _endTime: string, _limit = 100): Promise<LogEntry[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }
}