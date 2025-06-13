export interface TestMCPClientOptions {
  serverPath: string;
  serverArgs?: string[];
  env?: Record<string, string>;
  debug?: boolean;
  // Test: Non-AppSignal with proper All CI Checks
}

export interface ToolCallResult<T = any> {
  content: T[];
  isError?: boolean;
}

export interface ResourceReadResult<T = any> {
  contents: T[];
}
