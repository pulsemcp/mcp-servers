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
  triggers?: unknown[];
  affectedServices?: string[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogSearchResult {
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}
