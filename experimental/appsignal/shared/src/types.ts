// AppSignal types
export interface AppSignalConfig {
  apiKey: string;
  appId: string;
  environment?: string;
}

// Tool response types
export interface AlertDetails {
  id: string;
  name: string;
  status: string;
  triggers?: any[];
  affectedServices?: string[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface LogSearchResult {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}

// Incident types
export interface AnomalyIncidentData {
  id: string;
  number: number;
  summary?: string;
  description?: string;
  state?: 'open' | 'closed' | 'wip';
  count: number;
  createdAt?: string;
  lastOccurredAt?: string;
  updatedAt?: string;
  digests?: string[];
  alertState?: string;
  trigger?: {
    id: string;
    name: string;
    description?: string;
  };
  tags?: Array<{
    key: string;
    value: string;
  }>;
}

export interface IncidentListResult<T> {
  incidents: T[];
  total: number;
  hasMore: boolean;
}
