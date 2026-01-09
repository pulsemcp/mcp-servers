/**
 * Health check utilities for Agent Orchestrator MCP server.
 * These are exported separately for testing.
 */

export const DEFAULT_HEALTH_CHECK_TIMEOUT = 10000;
export const MAX_HEALTH_CHECK_TIMEOUT = 300000; // 5 minutes max

/**
 * Get a helpful hint based on the error message to guide users in troubleshooting.
 */
export function getErrorHint(errorMessage: string, timeout: number): string {
  // Check for authentication errors first (most common initial setup issue)
  if (
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorMessage.toLowerCase().includes('unauthorized') ||
    errorMessage.toLowerCase().includes('forbidden')
  ) {
    return '\nHint: Authentication failed. Check that AGENT_ORCHESTRATOR_API_KEY is correct.';
  }

  // Check for timeout errors
  if (errorMessage.toLowerCase().includes('timeout')) {
    return `\nHint: Connection timed out after ${timeout}ms. Check that the API server is running and reachable.`;
  }

  // Check for connection refused (specific error codes)
  if (errorMessage.includes('ECONNREFUSED')) {
    return '\nHint: Connection refused. Check that the API server is running and AGENT_ORCHESTRATOR_BASE_URL is correct.';
  }

  // Check for DNS resolution errors
  if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
    return '\nHint: Could not resolve hostname. Check that AGENT_ORCHESTRATOR_BASE_URL is correct.';
  }

  // Check for other connection errors (more specific patterns)
  if (
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('EHOSTUNREACH') ||
    errorMessage.includes('ENETUNREACH')
  ) {
    return '\nHint: Network error. Check that the API server is reachable and there are no firewall issues.';
  }

  // Check for invalid URL errors
  if (errorMessage.includes('Invalid URL') || errorMessage.includes('ERR_INVALID_URL')) {
    return '\nHint: Invalid URL. Check that AGENT_ORCHESTRATOR_BASE_URL is a valid URL (e.g., http://localhost:3000).';
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

/**
 * Perform a health check against the Agent Orchestrator API.
 * Makes a lightweight request to verify connectivity and authentication.
 */
export async function checkApiHealth(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number = DEFAULT_HEALTH_CHECK_TIMEOUT
): Promise<void> {
  // Validate inputs
  if (!baseUrl || baseUrl.trim().length === 0) {
    throw new Error('Base URL cannot be empty');
  }
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  // Remove trailing slash if present
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, '');

  // Use the sessions endpoint with minimal data to verify connectivity
  let url: URL;
  try {
    url = new URL(`${normalizedBaseUrl}/api/v1/sessions`);
  } catch {
    throw new Error(
      'Invalid URL: Check that AGENT_ORCHESTRATOR_BASE_URL is a valid URL (e.g., http://localhost:3000)'
    );
  }
  url.searchParams.set('per_page', '1');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
