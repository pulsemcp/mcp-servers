import { OnePasswordItem, OnePasswordRawItem } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * Sanitizes a raw item from the 1Password CLI by removing sensitive fields.
 * This prevents data leakage through fields like additional_information
 * and removes item IDs to prevent constructing unlock URLs without explicit
 * user action through the 1Password app.
 *
 * @param rawItem - Raw item from CLI
 * @returns Sanitized item with only safe fields
 */
function sanitizeItem(rawItem: OnePasswordRawItem): OnePasswordItem {
  return {
    title: rawItem.title,
    category: rawItem.category,
    // Only include vault name, not ID (to prevent ID exposure)
    vault: rawItem.vault ? { name: rawItem.vault.name } : undefined,
    tags: rawItem.tags,
    // Intentionally omit: id, additional_information, and any other fields
  };
}

/**
 * List items with a specific tag
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param tag - The tag to filter by
 * @param vaultId - Optional vault ID to narrow the search
 * @returns List of items with the specified tag (sanitized, no IDs or sensitive info)
 */
export async function listItemsByTag(
  serviceAccountToken: string,
  tag: string,
  vaultId?: string
): Promise<OnePasswordItem[]> {
  const args = ['item', 'list', '--tags', tag];

  if (vaultId) {
    args.push('--vault', vaultId);
  }

  const rawItems = await executeCommand<OnePasswordRawItem[]>(serviceAccountToken, args);

  // Sanitize all items to remove IDs and any sensitive fields like additional_information
  return rawItems.map(sanitizeItem);
}
