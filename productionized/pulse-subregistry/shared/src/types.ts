/**
 * Type definitions for PulseMCP Sub-Registry API responses
 */

/**
 * Repository information
 */
export interface Repository {
  url?: string;
  source?: string;
}

/**
 * Server data as returned by the API
 */
export interface Server {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  websiteUrl?: string;
  repository?: Repository;
  packages?: unknown[];
  remotes?: unknown[];
  // Additional fields may be present
  [key: string]: unknown;
}

/**
 * Server version metadata from PulseMCP
 */
export interface ServerVersionMeta {
  source?: string;
  status?: string;
  publishedAt?: string;
  updatedAt?: string;
  isLatest?: boolean;
  [key: string]: unknown;
}

/**
 * Server metadata from PulseMCP
 */
export interface PulseMCPServerMeta {
  visitorsEstimateMostRecentWeek?: number;
  visitorsEstimateLastFourWeeks?: number;
  visitorsEstimateTotal?: number;
  isOfficial?: boolean;
  [key: string]: unknown;
}

/**
 * Full metadata for a server entry
 */
export interface ServerEntryMeta {
  'com.pulsemcp/server'?: PulseMCPServerMeta;
  'com.pulsemcp/server-version'?: ServerVersionMeta;
  [key: string]: unknown;
}

/**
 * A server entry as returned by the list endpoint
 */
export interface ServerEntry {
  server: Server;
  _meta?: ServerEntryMeta;
}

/**
 * Raw API response from the list servers endpoint
 */
export interface ListServersApiResponse {
  servers: ServerEntry[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

/**
 * Processed response from the list servers endpoint
 * (flattened for easier tool consumption)
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
  _meta?: ServerEntryMeta;
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
