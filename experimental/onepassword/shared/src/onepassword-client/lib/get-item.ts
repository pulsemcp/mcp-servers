import { OnePasswordItemDetails } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * Get a specific item by ID or title
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param itemId - The item ID or title
 * @param vaultId - Optional vault ID to narrow the search
 * @returns The full item details
 */
export async function getItem(
  serviceAccountToken: string,
  itemId: string,
  vaultId?: string
): Promise<OnePasswordItemDetails> {
  const args = ['item', 'get', itemId];

  if (vaultId) {
    args.push('--vault', vaultId);
  }

  return executeCommand<OnePasswordItemDetails>(serviceAccountToken, args);
}
