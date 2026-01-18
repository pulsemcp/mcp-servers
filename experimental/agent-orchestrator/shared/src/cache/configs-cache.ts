/**
 * Shared cache for unified configs response.
 *
 * This module provides a centralized cache for the configs response
 * that is shared between get_configs and get_available_mcp_servers tools.
 *
 * Cache behavior:
 * - Session-level caching (persists for the lifetime of the MCP server process)
 * - No TTL (time-to-live) - data is considered valid until force_refresh
 * - Force refresh available via tool parameter
 */

import type { ConfigsResponse } from '../types.js';

// Module-level cache for configs (shared between tools)
let configsCache: ConfigsResponse | null = null;

/**
 * Clear the configs cache.
 * Useful for testing and for manual cache invalidation.
 */
export function clearConfigsCache(): void {
  configsCache = null;
}

/**
 * Get the current configs cache state.
 * Returns null if no data is cached.
 */
export function getConfigsCache(): ConfigsResponse | null {
  return configsCache;
}

/**
 * Update the configs cache with new data.
 */
export function setConfigsCache(configs: ConfigsResponse): void {
  configsCache = configs;
}

/**
 * Check if the cache contains data.
 */
export function hasConfigsCache(): boolean {
  return configsCache !== null;
}
