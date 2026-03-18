import { readElicitationConfig, type ElicitationConfig } from '@pulsemcp/mcp-elicitation';

/**
 * 1Password-specific elicitation configuration.
 *
 * Layers:
 * 1. Base elicitation config (ELICITATION_ENABLED, etc.) from @pulsemcp/mcp-elicitation
 * 2. Per-action overrides: OP_ELICITATION_READ, OP_ELICITATION_WRITE
 * 3. Whitelisted items: OP_WHITELISTED_ITEMS (bypass elicitation for specific items)
 */

export interface OnePasswordElicitationConfig {
  /** Base elicitation config from the shared library */
  base: ElicitationConfig;
  /** Whether to elicit confirmation for read operations (get_item credential access) */
  readElicitationEnabled: boolean;
  /** Whether to elicit confirmation for write operations (create_login, create_secure_note) */
  writeElicitationEnabled: boolean;
  /** Set of whitelisted item titles (case-insensitive) that bypass read elicitation */
  whitelistedItems: Set<string>;
}

/**
 * Parse a comma-separated list of whitelisted items from an environment variable.
 * Items are stored lowercase for case-insensitive matching.
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
 * Read the full 1Password elicitation configuration from environment variables.
 *
 * Environment variables:
 *   ELICITATION_ENABLED          - Master toggle (default: true). When false, all elicitation is bypassed.
 *   OP_ELICITATION_READ          - Override for read operations (default: follows ELICITATION_ENABLED)
 *   OP_ELICITATION_WRITE         - Override for write operations (default: follows ELICITATION_ENABLED)
 *   OP_WHITELISTED_ITEMS         - Comma-separated list of item titles that bypass read elicitation
 *                                  (e.g., "Stripe Key,AWS Credentials")
 *
 * Plus all standard elicitation env vars (ELICITATION_REQUEST_URL, etc.)
 */
export function readOnePasswordElicitationConfig(
  env: Record<string, string | undefined> = process.env
): OnePasswordElicitationConfig {
  const base = readElicitationConfig(env);

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
 */
export function isItemWhitelisted(
  config: OnePasswordElicitationConfig,
  itemTitle: string
): boolean {
  return config.whitelistedItems.has(itemTitle.toLowerCase());
}
