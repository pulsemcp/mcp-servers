/**
 * Logging utilities for consistent output across MCP servers
 */

/**
 * Log server startup message
 */
export function logServerStart(serverName: string, transport: string = 'stdio'): void {
  console.error(`MCP server ${serverName} running on ${transport}`);
}

/**
 * Log an error with context
 */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[ERROR] ${context}: ${message}`);
  if (stack) {
    console.error(stack);
  }
}

/**
 * Log a warning
 */
export function logWarning(context: string, message: string): void {
  console.error(`[WARN] ${context}: ${message}`);
}

/**
 * Log debug information (only in development)
 */
export function logDebug(context: string, message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error(`[DEBUG] ${context}: ${message}`);
  }
}
