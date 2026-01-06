import { OnePasswordItemDetails } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * Create a new login item
 *
 * @param serviceAccountToken - The service account token for authentication
 * @param vaultId - The vault ID to create the item in
 * @param title - The title for the login
 * @param username - The username
 * @param password - The password
 * @param url - Optional URL for the login
 * @param tags - Optional tags for the item
 * @returns The created item details
 */
export async function createLogin(
  serviceAccountToken: string,
  vaultId: string,
  title: string,
  username: string,
  password: string,
  url?: string,
  tags?: string[]
): Promise<OnePasswordItemDetails> {
  const args = [
    'item',
    'create',
    '--category',
    'login',
    '--vault',
    vaultId,
    '--title',
    title,
    `username=${username}`,
    `password=${password}`,
  ];

  if (url) {
    args.push(`url=${url}`);
  }

  if (tags && tags.length > 0) {
    args.push('--tags', tags.join(','));
  }

  return executeCommand<OnePasswordItemDetails>(serviceAccountToken, args);
}
