/**
 * Logging utilities — all output goes to stderr so stdout stays pure MCP protocol.
 */

export function logServerStart(serverName: string, transport: string = 'stdio'): void {
  console.error(`MCP server ${serverName} running on ${transport}`);
}

export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[ERROR] ${context}: ${message}`);
  if (stack) console.error(stack);
}

export function logWarning(context: string, message: string): void {
  console.error(`[WARN] ${context}: ${message}`);
}

export function logInfo(context: string, message: string): void {
  console.error(`[INFO] ${context}: ${message}`);
}

export function logDebug(context: string, message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error(`[DEBUG] ${context}: ${message}`);
  }
}
