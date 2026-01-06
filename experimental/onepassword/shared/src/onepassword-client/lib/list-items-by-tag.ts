import { OnePasswordItem } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * List items with a specific tag
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param tag - The tag to filter by
 * @param vaultId - Optional vault ID to narrow the search
 * @returns List of items with the specified tag
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

  return executeCommand<OnePasswordItem[]>(serviceAccountToken, args);
}
