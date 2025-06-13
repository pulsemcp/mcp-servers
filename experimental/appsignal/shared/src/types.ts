// AppSignal types
export interface AppSignalConfig {
  apiKey: string;
  appId: string;
  environment?: string;
  // Test: Proper All CI Checks implementation
  maxRetries?: number;
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
