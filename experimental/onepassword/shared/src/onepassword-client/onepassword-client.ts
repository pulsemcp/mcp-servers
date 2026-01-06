import {
  IOnePasswordClient,
  OnePasswordVault,
  OnePasswordItem,
  OnePasswordItemDetails,
} from '../types.js';
import { getVaults } from './lib/get-vaults.js';
import { getItem } from './lib/get-item.js';
import { listItems } from './lib/list-items.js';
import { listItemsByTag } from './lib/list-items-by-tag.js';
import { createLogin } from './lib/create-login.js';
import { createSecureNote } from './lib/create-secure-note.js';

/**
 * 1Password CLI client implementation.
 *
 * This client wraps the 1Password CLI (op) and provides a TypeScript interface
 * for interacting with 1Password vaults and items.
 *
 * Requirements:
 * - 1Password CLI (op) installed and available in PATH
 * - Service account token for authentication
 */
export class OnePasswordClient implements IOnePasswordClient {
  constructor(private serviceAccountToken: string) {}

  async getVaults(): Promise<OnePasswordVault[]> {
    return getVaults(this.serviceAccountToken);
  }

  async getItem(itemId: string, vaultId?: string): Promise<OnePasswordItemDetails> {
    return getItem(this.serviceAccountToken, itemId, vaultId);
  }

  async listItems(vaultId: string): Promise<OnePasswordItem[]> {
    return listItems(this.serviceAccountToken, vaultId);
  }

  async listItemsByTag(tag: string, vaultId?: string): Promise<OnePasswordItem[]> {
    return listItemsByTag(this.serviceAccountToken, tag, vaultId);
  }

  async createLogin(
    vaultId: string,
    title: string,
    username: string,
    password: string,
    url?: string,
    tags?: string[]
  ): Promise<OnePasswordItemDetails> {
    return createLogin(this.serviceAccountToken, vaultId, title, username, password, url, tags);
  }

  async createSecureNote(
    vaultId: string,
    title: string,
    content: string,
    tags?: string[]
  ): Promise<OnePasswordItemDetails> {
    return createSecureNote(this.serviceAccountToken, vaultId, title, content, tags);
  }
}
