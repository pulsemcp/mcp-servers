// =============================================================================
// 1PASSWORD URL PARSER
// =============================================================================
// Parses 1Password share URLs to extract item, vault, and account identifiers.
//
// URL format: https://start.1password.com/open/i?a=ACCOUNT&v=VAULT&i=ITEM&h=HOST
// - a: account ID
// - v: vault ID
// - i: item ID (this is what we use to whitelist items)
// - h: host domain
// =============================================================================

export interface ParsedOnePasswordUrl {
  accountId: string;
  vaultId: string;
  itemId: string;
  host: string;
}

/**
 * Parses a 1Password URL and extracts the identifiers.
 *
 * @param url - A 1Password URL like https://start.1password.com/open/i?a=...&v=...&i=...&h=...
 * @returns Parsed URL components or null if the URL is invalid
 *
 * @example
 * const parsed = parseOnePasswordUrl(
 *   'https://start.1password.com/open/i?a=ACCOUNT&v=VAULT&i=ITEM&h=my.1password.com'
 * );
 * // { accountId: 'ACCOUNT', vaultId: 'VAULT', itemId: 'ITEM', host: 'my.1password.com' }
 */
export function parseOnePasswordUrl(url: string): ParsedOnePasswordUrl | null {
  try {
    const parsed = new URL(url);

    // Validate it's a 1Password URL
    if (!parsed.hostname.includes('1password.com')) {
      return null;
    }

    // Extract query parameters
    const accountId = parsed.searchParams.get('a');
    const vaultId = parsed.searchParams.get('v');
    const itemId = parsed.searchParams.get('i');
    const host = parsed.searchParams.get('h');

    // All parameters are required
    if (!accountId || !vaultId || !itemId || !host) {
      return null;
    }

    return {
      accountId,
      vaultId,
      itemId,
      host,
    };
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Extracts just the item ID from a 1Password URL.
 * This is a convenience function for the common case of just needing the item ID.
 *
 * @param url - A 1Password URL
 * @returns The item ID or null if the URL is invalid
 */
export function extractItemIdFromUrl(url: string): string | null {
  const parsed = parseOnePasswordUrl(url);
  return parsed?.itemId ?? null;
}
