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
 * List all items in a vault
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param vaultId - The vault ID to list items from
 * @returns List of items in the vault (sanitized, no IDs or sensitive info)
 */
export async function listItems(
  serviceAccountToken: string,
  vaultId: string
): Promise<OnePasswordItem[]> {
  const rawItems = await executeCommand<OnePasswordRawItem[]>(serviceAccountToken, [
    'item',
    'list',
    '--vault',
    vaultId,
  ]);

  // Sanitize all items to remove IDs and any sensitive fields like additional_information
  return rawItems.map(sanitizeItem);
}
