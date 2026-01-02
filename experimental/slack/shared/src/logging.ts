/**
 * Centralized logging utilities for Slack MCP Server
 *
 * IMPORTANT: All logging uses console.error() to write to stderr.
 * The MCP protocol requires stdout to contain only JSON messages.
 */

export function logServerStart(serverName: string, transport: string = 'stdio'): void {
  console.error(`MCP server ${serverName} running on ${transport}`);
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${context}: ${message}`);
}

export function logWarning(context: string, message: string): void {
  console.error(`[WARN] ${context}: ${message}`);
}

export function logDebug(context: string, message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error(`[DEBUG] ${context}: ${message}`);
  }
}
