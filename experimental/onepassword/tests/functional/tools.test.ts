import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listVaultsTool } from '../../shared/src/tools/list-vaults-tool.js';
import { listItemsTool } from '../../shared/src/tools/list-items-tool.js';
import { getItemTool } from '../../shared/src/tools/get-item-tool.js';
import { listItemsByTagTool } from '../../shared/src/tools/list-items-by-tag-tool.js';
import { createLoginTool } from '../../shared/src/tools/create-login-tool.js';
import { createSecureNoteTool } from '../../shared/src/tools/create-secure-note-tool.js';
import { createMockOnePasswordClient } from '../mocks/onepassword-client.functional-mock.js';

describe('1Password Tools', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOnePasswordClient>;

  beforeEach(() => {
    // Minimal mock server for testing - we call tool handlers directly
    mockServer = {} as Server;
    mockClient = createMockOnePasswordClient();
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
    it('should get item details', async () => {
      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item.id).toBe('item-1');
      expect(item.title).toBe('Test Login');
      expect(item.fields).toBeDefined();
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
    it('should create a new login item', async () => {
      const tool = createLoginTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Login',
        username: 'newuser',
        password: 'newpass123',
      });

      const item = JSON.parse(result.content[0].text);
      expect(item.id).toBe('item-new');
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
    it('should create a new secure note', async () => {
      const tool = createSecureNoteTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Note',
        content: 'secret content',
      });

      const item = JSON.parse(result.content[0].text);
      expect(item.id).toBe('item-note');
      expect(item.category).toBe('SECURE_NOTE');
      expect(mockClient.createSecureNote).toHaveBeenCalledWith(
        'vault-1',
        'New Note',
        'secret content',
        undefined
      );
    });
  });
});
