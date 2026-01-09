/**
 * Health check utilities for SSH MCP server.
 * These are exported separately for testing.
 */

export const DEFAULT_HEALTH_CHECK_TIMEOUT = 10000;
export const MAX_HEALTH_CHECK_TIMEOUT = 300000; // 5 minutes max

/**
 * Get a helpful hint based on the error message to guide users in troubleshooting.
 */
export function getErrorHint(errorMessage: string, timeout: number): string {
  // Check for authentication errors first (most specific)
  if (
    errorMessage.toLowerCase().includes('authentication') ||
    errorMessage.toLowerCase().includes('auth')
  ) {
    return '\nHint: Check that your SSH key is loaded in the SSH agent (ssh-add -l) or that SSH_PRIVATE_KEY_PATH is correct.';
  }

  // Check for timeout errors
  if (errorMessage.toLowerCase().includes('timeout')) {
    return `\nHint: Connection timed out after ${timeout}ms. Check that the host is reachable and the port is correct.`;
  }

  // Check for connection refused (specific error codes)
  if (errorMessage.includes('ECONNREFUSED')) {
    return '\nHint: Connection refused. Check that the SSH server is running and the host/port are correct.';
  }

  // Check for DNS resolution errors
  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
    return '\nHint: Could not resolve hostname. Check that SSH_HOST is correct.';
  }

  // Check for other connection errors (more specific patterns)
  if (
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('EHOSTUNREACH') ||
    errorMessage.includes('ENETUNREACH')
  ) {
    return '\nHint: Network error. Check that the host is reachable and there are no firewall issues.';
  }

  return '';
}

/**
 * Parse and validate health check timeout from environment variable.
 * Returns validated timeout value or default.
 */
export function parseHealthCheckTimeout(
  envValue: string | undefined,
  warnFn?: (message: string) => void
): number {
  if (!envValue) {
    return DEFAULT_HEALTH_CHECK_TIMEOUT;
  }

  const parsed = parseInt(envValue, 10);
  if (!isNaN(parsed) && parsed > 0 && parsed <= MAX_HEALTH_CHECK_TIMEOUT) {
    return parsed;
  }

  if (warnFn) {
    warnFn(
      `Invalid HEALTH_CHECK_TIMEOUT: ${envValue}. Must be between 1 and ${MAX_HEALTH_CHECK_TIMEOUT}. Using default: ${DEFAULT_HEALTH_CHECK_TIMEOUT}ms`
    );
  }

  return DEFAULT_HEALTH_CHECK_TIMEOUT;
}
