import { OnePasswordVault } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * List all vaults accessible by the service account
 *
 * @param serviceAccountToken - The service account token for authentication
 * @returns List of vaults with id and name
 */
export async function getVaults(serviceAccountToken: string): Promise<OnePasswordVault[]> {
  return executeCommand<OnePasswordVault[]>(serviceAccountToken, ['vault', 'list']);
}
