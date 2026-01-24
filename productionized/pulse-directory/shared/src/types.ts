/**
 * Type definitions for PulseMCP Directory API responses
 */

/**
 * Metadata about the server in the directory
 */
export interface ServerMeta {
  nextCursor?: string;
  count?: number;
}

/**
 * Server data as returned by the API
 */
export interface Server {
  name: string;
  description?: string;
  url?: string;
  repository?: string;
  version?: string;
  // Additional fields may be present
  [key: string]: unknown;
}

/**
 * Response from the list servers endpoint
 */
export interface ListServersResponse {
  servers: Server[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

/**
 * Response from the get server version endpoint
 */
export interface GetServerResponse {
  server: Server;
  _meta?: ServerMeta;
}

/**
 * List servers options
 */
export interface ListServersOptions {
  cursor?: string;
  limit?: number;
  search?: string;
  version?: string;
}

/**
 * Get server options
 */
export interface GetServerOptions {
  serverName: string;
  version?: string;
}
