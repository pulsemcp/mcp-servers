import { OnePasswordItem } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * List all items in a vault
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param vaultId - The vault ID to list items from
 * @returns List of items in the vault
 */
export async function listItems(
  serviceAccountToken: string,
  vaultId: string
): Promise<OnePasswordItem[]> {
  return executeCommand<OnePasswordItem[]>(serviceAccountToken, [
    'item',
    'list',
    '--vault',
    vaultId,
  ]);
}
