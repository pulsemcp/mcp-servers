/**
 * Stderr logging utilities.
 *
 * All logging goes to stderr (console.error) so that stdout stays a pure
 * JSON stream for the MCP stdio transport.
 */

export function logServerStart(serverName: string): void {
  console.error(`[${serverName}] MCP server running on stdio`);
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[error] ${context}: ${message}`);
}

export function logWarning(context: string, message: string): void {
  console.error(`[warn] ${context}: ${message}`);
}

export function logInfo(context: string, message: string): void {
  console.error(`[info] ${context}: ${message}`);
}
