// =============================================================================
// UNLOCKED ITEMS WHITELIST
// =============================================================================
// Manages a whitelist of item IDs that are "unlocked" for credential access.
//
// By default, the get_item tool will NOT return sensitive credential fields
// unless the item has been explicitly unlocked by providing a 1Password URL.
//
// This provides a security layer where users must explicitly share a 1Password
// link to "unlock" an item before its credentials can be accessed.
// =============================================================================

// In-memory set of unlocked item IDs (reset on server restart)
const unlockedItems = new Set<string>();

/**
 * Unlock an item by adding its ID to the whitelist.
 * Once unlocked, the item's credentials can be retrieved via get_item.
 *
 * @param itemId - The item ID to unlock
 */
export function unlockItem(itemId: string): void {
  unlockedItems.add(itemId.toLowerCase());
}

/**
 * Lock an item by removing its ID from the whitelist.
 * After locking, get_item will return metadata but not credentials.
 *
 * @param itemId - The item ID to lock
 */
export function lockItem(itemId: string): void {
  unlockedItems.delete(itemId.toLowerCase());
}

/**
 * Check if an item is unlocked.
 *
 * @param itemId - The item ID to check
 * @returns true if the item is unlocked, false otherwise
 */
export function isItemUnlocked(itemId: string): boolean {
  return unlockedItems.has(itemId.toLowerCase());
}

/**
 * Get all unlocked item IDs.
 *
 * @returns Array of unlocked item IDs
 */
export function getUnlockedItems(): string[] {
  return Array.from(unlockedItems);
}

/**
 * Clear all unlocked items (useful for testing or security reset).
 */
export function clearUnlockedItems(): void {
  unlockedItems.clear();
}

/**
 * Get the count of unlocked items.
 */
export function getUnlockedItemCount(): number {
  return unlockedItems.size;
}
