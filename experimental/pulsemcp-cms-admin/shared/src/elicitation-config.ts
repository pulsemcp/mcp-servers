import { readElicitationConfig, type ElicitationConfig } from '@pulsemcp/mcp-elicitation';

/**
 * pulsemcp-cms-admin elicitation configuration.
 *
 * Layers:
 * 1. Base elicitation config from @pulsemcp/mcp-elicitation
 * 2. DANGEROUSLY_SKIP_ELICITATIONS override (must be explicitly "true" to bypass all elicitation)
 * 3. Per-action override: PULSEMCP_CMS_ADMIN_ELICITATION_DESTRUCTIVE
 *
 * Destructive elicitation gates the `tenants_destructive` tool group only
 * (delete_tenant, delete_api_key, revoke_api_key). All other write tools in
 * the server are not gated by elicitation.
 */

export interface CmsAdminElicitationConfig {
  /** Base elicitation config from the shared library */
  base: ElicitationConfig;
  /** Whether to elicit confirmation for destructive operations (delete_tenant, delete_api_key, revoke_api_key) */
  destructiveElicitationEnabled: boolean;
}

/**
 * Parse a boolean environment variable with a default.
 * Accepts "true"/"false" (case-insensitive). Unset = default.
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'false';
}

/**
 * Check whether DANGEROUSLY_SKIP_ELICITATIONS is explicitly set to "true".
 */
export function isDangerouslySkipElicitations(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.DANGEROUSLY_SKIP_ELICITATIONS?.toLowerCase() === 'true';
}

/**
 * Check whether HTTP fallback elicitation URLs are configured.
 */
export function hasHttpElicitationFallback(
  env: Record<string, string | undefined> = process.env
): boolean {
  return !!(env.ELICITATION_REQUEST_URL?.trim() && env.ELICITATION_POLL_URL?.trim());
}

/**
 * Read the full pulsemcp-cms-admin elicitation configuration from environment variables.
 *
 * Environment variables:
 *   DANGEROUSLY_SKIP_ELICITATIONS                 - Must be explicitly "true" to bypass all elicitation.
 *   PULSEMCP_CMS_ADMIN_ELICITATION_DESTRUCTIVE    - Override for destructive operations (default: follows base enabled state)
 *
 * Plus all standard elicitation env vars (ELICITATION_REQUEST_URL, etc.)
 */
export function readCmsAdminElicitationConfig(
  env: Record<string, string | undefined> = process.env
): CmsAdminElicitationConfig {
  // Map DANGEROUSLY_SKIP_ELICITATIONS to the base library's enabled flag.
  // The cms-admin server does not use ELICITATION_ENABLED — the only way to disable
  // destructive elicitation is via DANGEROUSLY_SKIP_ELICITATIONS=true.
  const dangerouslySkip = isDangerouslySkipElicitations(env);
  const base = readElicitationConfig({
    ...env,
    ELICITATION_ENABLED: dangerouslySkip ? 'false' : 'true',
  });

  const destructiveElicitationEnabled = base.enabled
    ? parseBooleanEnv(env.PULSEMCP_CMS_ADMIN_ELICITATION_DESTRUCTIVE, true)
    : false;

  return {
    base,
    destructiveElicitationEnabled,
  };
}

/**
 * Result of the elicitation safety check.
 */
export type ElicitationSafetyResult =
  | { safe: true; reason: 'dangerously_skip' | 'http_fallback' }
  | { safe: false; reason: 'no_elicitation_configured' };

/**
 * Check whether the elicitation configuration is safe to start the server when
 * destructive tools are enabled.
 *
 * The server is "safe" if either:
 * - DANGEROUSLY_SKIP_ELICITATIONS=true is explicitly set (operator opted out), or
 * - HTTP fallback URLs are configured (so elicitation will be reachable).
 *
 * Native MCP elicitation support cannot be detected at startup (it requires an
 * active client connection), so callers relying solely on native elicitation
 * should also configure HTTP fallback URLs.
 */
export function checkElicitationSafety(
  env: Record<string, string | undefined> = process.env
): ElicitationSafetyResult {
  if (isDangerouslySkipElicitations(env)) {
    return { safe: true, reason: 'dangerously_skip' };
  }
  if (hasHttpElicitationFallback(env)) {
    return { safe: true, reason: 'http_fallback' };
  }
  return { safe: false, reason: 'no_elicitation_configured' };
}
