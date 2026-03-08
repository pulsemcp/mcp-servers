/**
 * Minimal interface for the MCP server, avoiding direct dependency on
 * @modelcontextprotocol/sdk Server type to prevent cross-package type
 * mismatches in monorepo setups with multiple SDK installations.
 */
export interface MCPServerLike {
  getClientCapabilities(): { elicitation?: unknown } | undefined;
  elicitInput(params: unknown): Promise<{
    action: 'accept' | 'decline' | 'cancel';
    content?: Record<string, string | number | boolean | string[]>;
  }>;
}

/**
 * Vendor metadata for PulseMCP elicitation requests.
 * Uses reverse-DNS prefix `com.pulsemcp/` per MCP spec conventions.
 */
export interface ElicitationMeta {
  'com.pulsemcp/request-id'?: string;
  'com.pulsemcp/tool-name'?: string;
  'com.pulsemcp/context'?: string;
  'com.pulsemcp/session-id'?: string;
  'com.pulsemcp/expires-at'?: string;
}

/**
 * Schema for a single field in a form elicitation request.
 * Maps to PrimitiveSchemaDefinition in the MCP spec.
 */
export interface ElicitationFieldSchema {
  type: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  default?: string | number | boolean;
  // String-specific
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'uri' | 'date' | 'date-time';
  enum?: string[];
  // Number-specific
  minimum?: number;
  maximum?: number;
}

/**
 * Schema for the form presented to users during elicitation.
 */
export interface ElicitationRequestedSchema {
  type: 'object';
  properties: Record<string, ElicitationFieldSchema>;
  required?: string[];
}

/**
 * Configuration for the elicitation system.
 * Read from environment variables at initialization.
 */
export interface ElicitationConfig {
  /** Whether elicitation is enabled at all. Default: true (reads from ELICITATION_ENABLED env var). */
  enabled: boolean;
  /** POST endpoint for creating approval requests (HTTP fallback). */
  requestUrl?: string;
  /** Base URL for polling approval status (HTTP fallback). */
  pollUrl?: string;
  /** TTL for elicitation requests in milliseconds. Default: 5 minutes. */
  ttlMs: number;
  /** Poll interval in milliseconds. Default: 5 seconds. */
  pollIntervalMs: number;
}

/**
 * The result of an elicitation request.
 */
export interface ElicitationResult {
  action: 'accept' | 'decline' | 'cancel' | 'expired';
  content?: Record<string, string | number | boolean | string[]>;
}

/**
 * HTTP fallback response from the polling endpoint.
 */
export interface ElicitationPollResponse {
  action: 'pending' | 'accept' | 'decline' | 'cancel' | 'expired';
  content?: Record<string, string | number | boolean | string[]> | null;
  _meta?: {
    'com.pulsemcp/request-id'?: string;
    'com.pulsemcp/responded-at'?: string | null;
  };
}

/**
 * HTTP fallback response from the POST request endpoint.
 */
export interface ElicitationPostResponse {
  requestId: string;
}

/**
 * Options passed to the requestConfirmation function.
 */
export interface RequestConfirmationOptions {
  /** The MCP server instance (needed for native elicitation). */
  server: MCPServerLike;
  /** Human-readable message explaining what needs confirmation. */
  message: string;
  /** Schema for the form fields to present. */
  requestedSchema: ElicitationRequestedSchema;
  /** Optional vendor metadata. */
  meta?: ElicitationMeta;
}
