// AppSignal types
export interface AppSignalConfig {
  apiKey: string;
  appId: string;
  environment?: string;
  // Test: Verify All CI Checks Passed works
  verbose?: boolean;
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
