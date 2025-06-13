/**
 * Common TypeScript types for MCP servers
 */

/**
 * Standard response format for MCP tools
 */
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  // Test: This should NOT trigger AppSignal CI
}

/**
 * Tool definition structure
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
}

/**
 * Resource definition structure
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

/**
 * Base client interface for business logic
 */
export interface BaseClient {
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
  capabilities?: {
    resources?: boolean;
    tools?: boolean;
  };
}
