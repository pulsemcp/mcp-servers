import { OnePasswordItemDetails } from '../../types.js';
import { executeCommand } from './execute-command.js';

/**
 * Create a new API Credential item.
 *
 * Wraps `op item create --category 'API Credential' ...`. The API Credential
 * template exposes these fields: `username`, `credential`, `hostname`,
 * `valid from` (DATE), `expires` (DATE), and `notesPlain`.
 */
export async function createApiCredential(
  serviceAccountToken: string,
  vaultId: string,
  title: string,
  credential: string,
  options?: {
    username?: string;
    hostname?: string;
    expires?: string;
    validFrom?: string;
    notes?: string;
    tags?: string[];
  }
): Promise<OnePasswordItemDetails> {
  const args = [
    'item',
    'create',
    '--category',
    'API Credential',
    '--vault',
    vaultId,
    '--title',
    title,
    `credential=${credential}`,
  ];

  if (options?.username) {
    args.push(`username=${options.username}`);
  }

  if (options?.hostname) {
    args.push(`hostname=${options.hostname}`);
  }

  if (options?.validFrom) {
    // The API Credential template labels this field "valid from" (with a space).
    args.push(`valid from=${options.validFrom}`);
  }

  if (options?.expires) {
    args.push(`expires=${options.expires}`);
  }

  if (options?.notes) {
    args.push(`notesPlain=${options.notes}`);
  }

  if (options?.tags && options.tags.length > 0) {
    args.push('--tags', options.tags.join(','));
  }

  return executeCommand<OnePasswordItemDetails>(serviceAccountToken, args);
}
