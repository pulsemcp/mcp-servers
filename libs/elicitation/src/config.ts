import type { ElicitationConfig } from './types.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_POLL_INTERVAL_MS = 5 * 1000; // 5 seconds

/**
 * Reads elicitation configuration from environment variables.
 *
 * Environment variables:
 *   ELICITATION_ENABLED       - "true" (default) or "false"
 *   ELICITATION_REQUEST_URL   - POST endpoint for HTTP fallback
 *   ELICITATION_POLL_URL      - GET endpoint for HTTP fallback polling
 *   ELICITATION_TTL_MS        - Request TTL in milliseconds (default: 300000)
 *   ELICITATION_POLL_INTERVAL_MS - Poll interval in milliseconds (default: 5000)
 */
export function readElicitationConfig(
  env: Record<string, string | undefined> = process.env
): ElicitationConfig {
  const enabledRaw = env.ELICITATION_ENABLED;
  const enabled = enabledRaw === undefined ? true : enabledRaw.toLowerCase() !== 'false';

  return {
    enabled,
    requestUrl: env.ELICITATION_REQUEST_URL,
    pollUrl: env.ELICITATION_POLL_URL,
    ttlMs: env.ELICITATION_TTL_MS ? parseInt(env.ELICITATION_TTL_MS, 10) : DEFAULT_TTL_MS,
    pollIntervalMs: env.ELICITATION_POLL_INTERVAL_MS
      ? parseInt(env.ELICITATION_POLL_INTERVAL_MS, 10)
      : DEFAULT_POLL_INTERVAL_MS,
  };
}
