import { OnePasswordItemDetails } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * Create a new secure note
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param vaultId - The vault ID to create the item in
 * @param title - The title for the secure note
 * @param content - The content of the secure note
 * @param tags - Optional tags for the item
 * @returns The created item details
 */
export async function createSecureNote(
  serviceAccountToken: string,
  vaultId: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<OnePasswordItemDetails> {
  const args = [
    'item',
    'create',
    '--category',
    'Secure Note',
    '--vault',
    vaultId,
    '--title',
    title,
    `notesPlain=${content}`,
  ];

  if (tags && tags.length > 0) {
    args.push('--tags', tags.join(','));
  }

  return executeCommand<OnePasswordItemDetails>(serviceAccountToken, args);
}
