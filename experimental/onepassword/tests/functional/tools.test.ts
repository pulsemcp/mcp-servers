import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listVaultsTool } from '../../shared/src/tools/list-vaults-tool.js';
import { listItemsTool } from '../../shared/src/tools/list-items-tool.js';
import { getItemTool } from '../../shared/src/tools/get-item-tool.js';
import { listItemsByTagTool } from '../../shared/src/tools/list-items-by-tag-tool.js';
import { createLoginTool } from '../../shared/src/tools/create-login-tool.js';
import { createSecureNoteTool } from '../../shared/src/tools/create-secure-note-tool.js';
import { unlockItemTool } from '../../shared/src/tools/unlock-item-tool.js';
import { createMockOnePasswordClient } from '../mocks/onepassword-client.functional-mock.js';
import {
  OnePasswordNotFoundError,
  OnePasswordAuthenticationError,
  OnePasswordCommandError,
} from '../../shared/src/types.js';
import { parseOnePasswordUrl, extractItemIdFromUrl } from '../../shared/src/url-parser.js';
import {
  unlockItem,
  lockItem,
  isItemUnlocked,
  clearUnlockedItems,
} from '../../shared/src/unlocked-items.js';

describe('1Password Tools', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOnePasswordClient>;

  beforeEach(() => {
    // Minimal mock server for testing - we call tool handlers directly
    mockServer = {} as Server;
    mockClient = createMockOnePasswordClient();
    // Clear unlocked items between tests
    clearUnlockedItems();
  });

  describe('onepassword_list_vaults', () => {
    it('should list all vaults', async () => {
      const tool = listVaultsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      const vaults = JSON.parse(result.content[0].text);
      expect(vaults).toHaveLength(2);
      expect(vaults[0]).toEqual({ id: 'vault-1', name: 'Personal' });
      expect(vaults[1]).toEqual({ id: 'vault-2', name: 'Work' });
      expect(mockClient.getVaults).toHaveBeenCalled();
    });
  });

  describe('onepassword_list_items', () => {
    it('should list items in a vault', async () => {
      const tool = listItemsTool(mockServer, () => mockClient);
      const result = await tool.handler({ vaultId: 'vault-1' });

      const items = JSON.parse(result.content[0].text);
      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('Test Login');
      expect(mockClient.listItems).toHaveBeenCalledWith('vault-1');
    });

    it('should return error when vaultId is missing', async () => {
      const tool = listItemsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('onepassword_get_item', () => {
    it('should get item details without exposing IDs', async () => {
      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      // Security: IDs should be stripped from response
      expect(item.id).toBeUndefined();
      expect(item.title).toBe('Test Login');
      expect(item.fields).toBeDefined();
      // Fields should also not have IDs
      expect(item.fields[0].id).toBeUndefined();
      expect(item.fields[0].label).toBe('username');
      // Vault should only have name, not ID
      expect(item.vault.name).toBe('Personal');
      expect(item.vault.id).toBeUndefined();
      expect(mockClient.getItem).toHaveBeenCalledWith('item-1', undefined);
    });

    it('should pass vaultId when provided', async () => {
      const tool = getItemTool(mockServer, () => mockClient);
      await tool.handler({ itemId: 'item-1', vaultId: 'vault-1' });

      expect(mockClient.getItem).toHaveBeenCalledWith('item-1', 'vault-1');
    });
  });

  describe('onepassword_list_items_by_tag', () => {
    it('should list items with a specific tag', async () => {
      const tool = listItemsByTagTool(mockServer, () => mockClient);
      const result = await tool.handler({ tag: 'api' });

      const items = JSON.parse(result.content[0].text);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('API Key');
      expect(mockClient.listItemsByTag).toHaveBeenCalledWith('api', undefined);
    });
  });

  describe('onepassword_create_login', () => {
    it('should create a new login item without exposing IDs', async () => {
      const tool = createLoginTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Login',
        username: 'newuser',
        password: 'newpass123',
      });

      const item = JSON.parse(result.content[0].text);
      // Security: ID should be stripped from response
      expect(item.id).toBeUndefined();
      expect(item.category).toBe('LOGIN');
      expect(mockClient.createLogin).toHaveBeenCalledWith(
        'vault-1',
        'New Login',
        'newuser',
        'newpass123',
        undefined,
        undefined
      );
    });

    it('should pass optional url and tags', async () => {
      const tool = createLoginTool(mockServer, () => mockClient);
      await tool.handler({
        vaultId: 'vault-1',
        title: 'New Login',
        username: 'newuser',
        password: 'newpass123',
        url: 'https://example.com',
        tags: ['work', 'important'],
      });

      expect(mockClient.createLogin).toHaveBeenCalledWith(
        'vault-1',
        'New Login',
        'newuser',
        'newpass123',
        'https://example.com',
        ['work', 'important']
      );
    });
  });

  describe('onepassword_create_secure_note', () => {
    it('should create a new secure note without exposing IDs', async () => {
      const tool = createSecureNoteTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Note',
        content: 'secret content',
      });

      const item = JSON.parse(result.content[0].text);
      // Security: ID should be stripped from response
      expect(item.id).toBeUndefined();
      expect(item.category).toBe('SECURE_NOTE');
      expect(mockClient.createSecureNote).toHaveBeenCalledWith(
        'vault-1',
        'New Note',
        'secret content',
        undefined
      );
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================
  describe('Error Handling', () => {
    it('should handle NotFoundError gracefully', async () => {
      mockClient.getItem = vi
        .fn()
        .mockRejectedValue(new OnePasswordNotFoundError('item-123', 'item'));

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-123' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('item-123');
    });

    it('should handle AuthenticationError gracefully', async () => {
      mockClient.getVaults = vi
        .fn()
        .mockRejectedValue(new OnePasswordAuthenticationError('Invalid service account token'));

      const tool = listVaultsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid service account token');
    });

    it('should handle CommandError gracefully', async () => {
      mockClient.listItems = vi
        .fn()
        .mockRejectedValue(new OnePasswordCommandError('CLI execution failed', 1));

      const tool = listItemsTool(mockServer, () => mockClient);
      const result = await tool.handler({ vaultId: 'vault-1' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('CLI execution failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockClient.getVaults = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const tool = listVaultsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected error');
    });

    it('should reject invalid URL in create_login', async () => {
      const tool = createLoginTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'Test Login',
        username: 'user',
        password: 'pass',
        url: 'not-a-valid-url', // Invalid URL
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  // =============================================================================
  // URL PARSING TESTS
  // =============================================================================
  describe('URL Parsing', () => {
    it('should parse valid 1Password URL', () => {
      const url =
        'https://start.1password.com/open/i?a=ACCOUNT123&v=vault456&i=item789&h=my.1password.com';
      const parsed = parseOnePasswordUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed!.accountId).toBe('ACCOUNT123');
      expect(parsed!.vaultId).toBe('vault456');
      expect(parsed!.itemId).toBe('item789');
      expect(parsed!.host).toBe('my.1password.com');
    });

    it('should extract item ID from URL', () => {
      const url = 'https://start.1password.com/open/i?a=ACC&v=VAULT&i=ITEMID&h=test.1password.com';
      const itemId = extractItemIdFromUrl(url);

      expect(itemId).toBe('ITEMID');
    });

    it('should return null for invalid URL', () => {
      expect(parseOnePasswordUrl('not-a-url')).toBeNull();
      expect(parseOnePasswordUrl('https://example.com')).toBeNull();
      expect(parseOnePasswordUrl('https://start.1password.com/open/i')).toBeNull();
    });

    it('should return null for URL with missing parameters', () => {
      expect(parseOnePasswordUrl('https://start.1password.com/open/i?a=ACC')).toBeNull();
      expect(parseOnePasswordUrl('https://start.1password.com/open/i?a=ACC&v=VAULT')).toBeNull();
    });

    it('should reject malicious lookalike hostnames', () => {
      // These should all be rejected as they're not legitimate 1password.com domains
      expect(
        parseOnePasswordUrl(
          'https://evil1password.com/open/i?a=ACC&v=VAULT&i=ITEM&h=test.1password.com'
        )
      ).toBeNull();
      expect(
        parseOnePasswordUrl(
          'https://1password.com.evil.com/open/i?a=ACC&v=VAULT&i=ITEM&h=test.1password.com'
        )
      ).toBeNull();
      expect(
        parseOnePasswordUrl(
          'https://my.1password.com.attacker.com/open/i?a=ACC&v=VAULT&i=ITEM&h=test.1password.com'
        )
      ).toBeNull();
    });

    it('should reject URLs with wrong path', () => {
      expect(
        parseOnePasswordUrl(
          'https://start.1password.com/evil/path?a=ACC&v=VAULT&i=ITEM&h=test.1password.com'
        )
      ).toBeNull();
      expect(
        parseOnePasswordUrl(
          'https://start.1password.com/?a=ACC&v=VAULT&i=ITEM&h=test.1password.com'
        )
      ).toBeNull();
    });

    it('should accept legitimate 1password.com subdomains', () => {
      const url = 'https://start.1password.com/open/i?a=ACC&v=VAULT&i=ITEM&h=test.1password.com';
      const parsed = parseOnePasswordUrl(url);
      expect(parsed).not.toBeNull();
      expect(parsed!.itemId).toBe('ITEM');
    });
  });

  // =============================================================================
  // UNLOCKED ITEMS TESTS
  // =============================================================================
  describe('Unlocked Items', () => {
    it('should track unlocked items', () => {
      expect(isItemUnlocked('item-1')).toBe(false);

      unlockItem('item-1');
      expect(isItemUnlocked('item-1')).toBe(true);

      lockItem('item-1');
      expect(isItemUnlocked('item-1')).toBe(false);
    });

    it('should be case-insensitive', () => {
      unlockItem('ITEM-1');
      expect(isItemUnlocked('item-1')).toBe(true);
      expect(isItemUnlocked('ITEM-1')).toBe(true);
    });
  });

  // =============================================================================
  // UNLOCK ITEM TOOL TESTS
  // =============================================================================
  describe('onepassword_unlock_item', () => {
    it('should unlock item from valid URL', async () => {
      const tool = unlockItemTool(mockServer, () => mockClient);
      const url =
        'https://start.1password.com/open/i?a=ACC&v=vault-1&i=item-1&h=test.1password.com';
      const result = await tool.handler({ url });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('unlocked successfully');
      expect(isItemUnlocked('item-1')).toBe(true);
    });

    it('should return error for invalid URL', async () => {
      const tool = unlockItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://example.com' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid 1Password URL');
    });

    it('should indicate if item is already unlocked', async () => {
      unlockItem('item-1');
      const tool = unlockItemTool(mockServer, () => mockClient);
      const url =
        'https://start.1password.com/open/i?a=ACC&v=vault-1&i=item-1&h=test.1password.com';
      const result = await tool.handler({ url });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('already unlocked');
    });
  });

  // =============================================================================
  // GET ITEM WITH UNLOCK/LOCK TESTS
  // =============================================================================
  describe('onepassword_get_item with unlock/lock', () => {
    it('should redact sensitive fields when item is locked', async () => {
      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._unlocked).toBe(false);

      // Check that password field is redacted (using label since id is stripped)
      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('[REDACTED - use unlock_item first]');
    });

    it('should show full credentials when item is unlocked', async () => {
      unlockItem('item-1');

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._unlocked).toBe(true);

      // Check that password field is NOT redacted (using label since id is stripped)
      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should re-lock item and redact credentials again', async () => {
      unlockItem('item-1');
      lockItem('item-1');

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._unlocked).toBe(false);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('[REDACTED - use unlock_item first]');
    });
  });
});
