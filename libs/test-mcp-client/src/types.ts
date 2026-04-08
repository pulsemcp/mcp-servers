export interface ElicitationHandler {
  (params: {
    message: string;
    requestedSchema: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  }): Promise<{
    action: 'accept' | 'decline' | 'cancel';
    content?: Record<string, string | number | boolean | string[]>;
  }>;
}

export interface TestMCPClientOptions {
  serverPath: string;
  serverArgs?: string[];
  env?: Record<string, string>;
  debug?: boolean;
  /** Enable elicitation capability and provide a handler for elicitation requests. */
  elicitationHandler?: ElicitationHandler;
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
