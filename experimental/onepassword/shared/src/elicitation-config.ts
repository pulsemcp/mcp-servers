import { readElicitationConfig, type ElicitationConfig } from '@pulsemcp/mcp-elicitation';

/**
 * 1Password-specific elicitation configuration.
 *
 * Layers:
 * 1. Base elicitation config (ELICITATION_ENABLED, etc.) from @pulsemcp/mcp-elicitation
 * 2. DANGEROUSLY_SKIP_ELICITATIONS override (must be explicitly "true" to bypass all elicitation)
 * 3. Per-action overrides: OP_ELICITATION_READ, OP_ELICITATION_WRITE
 * 4. Whitelisted items: OP_WHITELISTED_ITEMS (bypass elicitation for specific items)
 */

export interface OnePasswordElicitationConfig {
  /** Base elicitation config from the shared library */
  base: ElicitationConfig;
  /** Whether to elicit confirmation for read operations (get_item credential access) */
  readElicitationEnabled: boolean;
  /** Whether to elicit confirmation for write operations (create_login, create_secure_note) */
  writeElicitationEnabled: boolean;
  /** Set of whitelisted item titles or IDs (case-insensitive) that bypass read elicitation */
  whitelistedItems: Set<string>;
}

/**
 * Parse a comma-separated list of whitelisted items from an environment variable.
 * Each entry can be either an item title or an item ID.
 * Entries are stored lowercase for case-insensitive matching.
 */
function parseWhitelistedItems(value?: string): Set<string> {
  if (!value || value.trim() === '') {
    return new Set();
  }
  return new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );
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
  return !!(env.ELICITATION_REQUEST_URL && env.ELICITATION_POLL_URL);
}

/**
 * Read the full 1Password elicitation configuration from environment variables.
 *
 * Environment variables:
 *   DANGEROUSLY_SKIP_ELICITATIONS - Must be explicitly "true" to bypass all elicitation.
 *                                    Replaces ELICITATION_ENABLED=false for disabling confirmations.
 *   OP_ELICITATION_READ           - Override for read operations (default: follows elicitation enabled state)
 *   OP_ELICITATION_WRITE          - Override for write operations (default: follows elicitation enabled state)
 *   OP_WHITELISTED_ITEMS          - Comma-separated list of item titles or item IDs that bypass read elicitation
 *                                   (e.g., "Stripe Key,AWS Credentials,abc123def456")
 *
 * Plus all standard elicitation env vars (ELICITATION_REQUEST_URL, etc.)
 */
export function readOnePasswordElicitationConfig(
  env: Record<string, string | undefined> = process.env
): OnePasswordElicitationConfig {
  // DANGEROUSLY_SKIP_ELICITATIONS=true overrides the base config to disable elicitation
  const dangerouslySkip = isDangerouslySkipElicitations(env);
  const effectiveEnv = dangerouslySkip ? { ...env, ELICITATION_ENABLED: 'false' } : env;
  const base = readElicitationConfig(effectiveEnv);

  // Per-action overrides default to the base enabled state
  const readElicitationEnabled = base.enabled
    ? parseBooleanEnv(env.OP_ELICITATION_READ, true)
    : false;
  const writeElicitationEnabled = base.enabled
    ? parseBooleanEnv(env.OP_ELICITATION_WRITE, true)
    : false;

  const whitelistedItems = parseWhitelistedItems(env.OP_WHITELISTED_ITEMS);

  return {
    base,
    readElicitationEnabled,
    writeElicitationEnabled,
    whitelistedItems,
  };
}

/**
 * Check if a specific item is whitelisted (bypasses read elicitation).
 * Matches against both item title and item ID (case-insensitive).
 */
export function isItemWhitelisted(
  config: OnePasswordElicitationConfig,
  itemTitle: string,
  itemId?: string
): boolean {
  if (config.whitelistedItems.has(itemTitle.toLowerCase())) {
    return true;
  }
  if (itemId && config.whitelistedItems.has(itemId.toLowerCase())) {
    return true;
  }
  return false;
}
