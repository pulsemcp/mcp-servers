import type { ElicitationConfig } from './types.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_POLL_INTERVAL_MS = 5 * 1000; // 5 seconds
const MIN_POLL_INTERVAL_MS = 1000; // 1 second minimum to prevent tight loops

/**
 * Parses a positive integer from a string, returning the default if invalid.
 */
function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? defaultValue : parsed;
}

/**
 * Reads elicitation configuration from environment variables.
 *
 * Environment variables:
 *   ELICITATION_ENABLED              - "true" (default) or "false"
 *   ELICITATION_REQUEST_URL          - POST endpoint for HTTP fallback
 *   ELICITATION_POLL_URL             - GET endpoint for HTTP fallback polling
 *   ELICITATION_TTL_MS               - Request TTL in milliseconds (default: 300000)
 *   ELICITATION_POLL_INTERVAL_MS     - Poll interval in milliseconds (default: 5000, min: 1000)
 *   ELICITATION_SESSION_ID           - Session identifier for HTTP fallback `_meta`
 *   ELICITATION_PREFER_HTTP_FALLBACK - "true" forces HTTP fallback over native elicitation
 *                                      when both are available. Default: "false".
 */
export function readElicitationConfig(
  env: Record<string, string | undefined> = process.env
): ElicitationConfig {
  const enabledRaw = env.ELICITATION_ENABLED;
  const enabled = enabledRaw === undefined ? true : enabledRaw.toLowerCase() !== 'false';

  const preferHttpFallbackRaw = env.ELICITATION_PREFER_HTTP_FALLBACK;
  const preferHttpFallback =
    preferHttpFallbackRaw !== undefined && preferHttpFallbackRaw.toLowerCase() === 'true';

  const pollIntervalMs = Math.max(
    MIN_POLL_INTERVAL_MS,
    parsePositiveInt(env.ELICITATION_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS)
  );

  return {
    enabled,
    requestUrl: env.ELICITATION_REQUEST_URL,
    pollUrl: env.ELICITATION_POLL_URL,
    ttlMs: parsePositiveInt(env.ELICITATION_TTL_MS, DEFAULT_TTL_MS),
    pollIntervalMs,
    sessionId: env.ELICITATION_SESSION_ID,
    preferHttpFallback,
  };
}
