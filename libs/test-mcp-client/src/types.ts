export interface TestMCPClientOptions {
  serverPath: string;
  serverArgs?: string[];
  env?: Record<string, string>;
  debug?: boolean;
}

export interface ToolCallResult<T = unknown> {
  content: T[];
  isError?: boolean;
}

export interface ToolCallOptions {
  timeout?: number;
}

export interface ResourceReadResult<T = unknown> {
  contents: T[];
}
