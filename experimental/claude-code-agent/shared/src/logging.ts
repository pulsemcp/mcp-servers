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
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG ||
    process.env.CLAUDE_AGENT_LOG_LEVEL === 'debug'
  ) {
    console.error(`[DEBUG] ${context}: ${message}`);
  }
}

/**
 * Log info message
 */
export function logInfo(context: string, message: string): void {
  console.error(`[INFO] ${context}: ${message}`);
}

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, error?: unknown) => void;
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      const fullMessage = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
      logDebug(context, fullMessage);
    },
    info: (message: string, ...args: unknown[]) => {
      const fullMessage = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
      logInfo(context, fullMessage);
    },
    warn: (message: string, ...args: unknown[]) => {
      const fullMessage = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
      logWarning(context, fullMessage);
    },
    error: (message: string, error?: unknown) => {
      if (error) {
        logError(context, error);
      } else {
        console.error(`[ERROR] ${context}: ${message}`);
      }
    },
  };
}
