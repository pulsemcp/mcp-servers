// AppSignal API client interface
export interface ExceptionIncident {
  id: string;
  name: string;
  message: string;
  count: number;
  lastOccurredAt: string;
  status: 'open' | 'resolved' | 'muted';
}

export interface ExceptionIncidentSample {
  id: string;
  timestamp: string;
  message: string;
  backtrace: string[];
  metadata?: Record<string, unknown>;
}

export interface LogIncident {
  id: string;
  name: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  count: number;
  lastOccurredAt: string;
  status: 'open' | 'resolved' | 'muted';
  query?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface IAppsignalClient {
  getExceptionIncident(incidentId: string): Promise<ExceptionIncident>;
  getExceptionIncidentSamples(incidentId: string, limit?: number): Promise<ExceptionIncidentSample[]>;
  getLogIncident(incidentId: string): Promise<LogIncident>;
  searchLogs(query: string, limit?: number, offset?: number): Promise<LogEntry[]>;
}

// Stub implementation for now
export class AppsignalClient implements IAppsignalClient {
  constructor(private readonly apiKey: string, private readonly appId: string) {
    // These will be used when implementing actual API calls
    void this.apiKey;
    void this.appId;
  }

  async getExceptionIncident(_incidentId: string): Promise<ExceptionIncident> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async getExceptionIncidentSamples(_incidentId: string, _limit = 10): Promise<ExceptionIncidentSample[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async getLogIncident(_incidentId: string): Promise<LogIncident> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }

  async searchLogs(_query: string, _limit = 100, _offset = 0): Promise<LogEntry[]> {
    // TODO: Implement actual API call using this.apiKey and this.appId
    throw new Error('Not implemented');
  }
}