import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listVaultsTool } from '../../shared/src/tools/list-vaults-tool.js';
import { listItemsTool } from '../../shared/src/tools/list-items-tool.js';
import { getItemTool } from '../../shared/src/tools/get-item-tool.js';
import { listItemsByTagTool } from '../../shared/src/tools/list-items-by-tag-tool.js';
import { createLoginTool } from '../../shared/src/tools/create-login-tool.js';
import { createSecureNoteTool } from '../../shared/src/tools/create-secure-note-tool.js';
import { createMockOnePasswordClient } from '../mocks/onepassword-client.functional-mock.js';
import {
  OnePasswordNotFoundError,
  OnePasswordAuthenticationError,
  OnePasswordCommandError,
} from '../../shared/src/types.js';
import { parseOnePasswordUrl, extractItemIdFromUrl } from '../../shared/src/url-parser.js';
import {
  readOnePasswordElicitationConfig,
  isItemWhitelisted,
} from '../../shared/src/elicitation-config.js';

describe('1Password Tools', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOnePasswordClient>;

  beforeEach(() => {
    // Minimal mock server for testing - we call tool handlers directly
    mockServer = {} as Server;
    mockClient = createMockOnePasswordClient();
  });

  afterEach(() => {
    // Restore env vars
    delete process.env.ELICITATION_ENABLED;
    delete process.env.OP_ELICITATION_READ;
    delete process.env.OP_ELICITATION_WRITE;
    delete process.env.OP_WHITELISTED_ITEMS;
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
    it('should get item details without exposing IDs when elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'false';

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
      process.env.ELICITATION_ENABLED = 'false';

      const tool = getItemTool(mockServer, () => mockClient);
      await tool.handler({ itemId: 'item-1', vaultId: 'vault-1' });

      expect(mockClient.getItem).toHaveBeenCalledWith('item-1', 'vault-1');
    });

    it('should reveal credentials when elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'false';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should reveal credentials when read elicitation is disabled but master is enabled', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_ELICITATION_READ = 'false';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should reveal credentials for whitelisted items without elicitation', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_WHITELISTED_ITEMS = 'Test Login,Other Item';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should be case-insensitive for whitelisted items', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_WHITELISTED_ITEMS = 'test login';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);
    });

    it('should reveal credentials when item is whitelisted by item ID', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      // Whitelist by the mock item's ID ('item-1') rather than its title
      process.env.OP_WHITELISTED_ITEMS = 'item-1';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
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
    it('should create a new login item without exposing IDs when elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'false';

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
      process.env.ELICITATION_ENABLED = 'false';

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

    it('should create login without prompt when write elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_ELICITATION_WRITE = 'false';

      const tool = createLoginTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Login',
        username: 'newuser',
        password: 'newpass123',
      });

      const item = JSON.parse(result.content[0].text);
      expect(item.category).toBe('LOGIN');
      expect(mockClient.createLogin).toHaveBeenCalled();
    });
  });

  describe('onepassword_create_secure_note', () => {
    it('should create a new secure note without exposing IDs when elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'false';

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

    it('should create note without prompt when write elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_ELICITATION_WRITE = 'false';

      const tool = createSecureNoteTool(mockServer, () => mockClient);
      const result = await tool.handler({
        vaultId: 'vault-1',
        title: 'New Note',
        content: 'secret content',
      });

      const item = JSON.parse(result.content[0].text);
      expect(item.category).toBe('SECURE_NOTE');
      expect(mockClient.createSecureNote).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ELICITATION_ENABLED = 'false';
    });

    it('should handle NotFoundError gracefully', async () => {
      mockClient.getItem = vi
        .fn()
        .mockRejectedValue(new OnePasswordNotFoundError('Item "item-123" not found'));

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
  // ELICITATION CONFIG TESTS
  // =============================================================================
  describe('Elicitation Config', () => {
    it('should default to elicitation enabled for reads and writes', () => {
      const config = readOnePasswordElicitationConfig({});
      expect(config.readElicitationEnabled).toBe(true);
      expect(config.writeElicitationEnabled).toBe(true);
      expect(config.whitelistedItems.size).toBe(0);
    });

    it('should disable all elicitation when ELICITATION_ENABLED is false', () => {
      const config = readOnePasswordElicitationConfig({
        ELICITATION_ENABLED: 'false',
      });
      expect(config.readElicitationEnabled).toBe(false);
      expect(config.writeElicitationEnabled).toBe(false);
    });

    it('should allow per-action overrides', () => {
      const config = readOnePasswordElicitationConfig({
        OP_ELICITATION_READ: 'false',
        OP_ELICITATION_WRITE: 'true',
      });
      expect(config.readElicitationEnabled).toBe(false);
      expect(config.writeElicitationEnabled).toBe(true);
    });

    it('should respect master disable even with per-action enabled', () => {
      const config = readOnePasswordElicitationConfig({
        ELICITATION_ENABLED: 'false',
        OP_ELICITATION_READ: 'true',
        OP_ELICITATION_WRITE: 'true',
      });
      expect(config.readElicitationEnabled).toBe(false);
      expect(config.writeElicitationEnabled).toBe(false);
    });

    it('should parse whitelisted items', () => {
      const config = readOnePasswordElicitationConfig({
        OP_WHITELISTED_ITEMS: 'Stripe Key, AWS Credentials, GitHub Token',
      });
      expect(config.whitelistedItems.size).toBe(3);
      expect(isItemWhitelisted(config, 'Stripe Key')).toBe(true);
      expect(isItemWhitelisted(config, 'stripe key')).toBe(true);
      expect(isItemWhitelisted(config, 'STRIPE KEY')).toBe(true);
      expect(isItemWhitelisted(config, 'Unknown Item')).toBe(false);
    });

    it('should handle empty whitelist', () => {
      const config = readOnePasswordElicitationConfig({
        OP_WHITELISTED_ITEMS: '',
      });
      expect(config.whitelistedItems.size).toBe(0);
    });

    it('should handle whitelist with extra whitespace and commas', () => {
      const config = readOnePasswordElicitationConfig({
        OP_WHITELISTED_ITEMS: ' , Stripe Key , , AWS ,',
      });
      expect(config.whitelistedItems.size).toBe(2);
      expect(isItemWhitelisted(config, 'Stripe Key')).toBe(true);
      expect(isItemWhitelisted(config, 'AWS')).toBe(true);
    });

    it('should match whitelisted items by item ID', () => {
      const config = readOnePasswordElicitationConfig({
        OP_WHITELISTED_ITEMS: 'abc123def456,Stripe Key',
      });
      // Match by title
      expect(isItemWhitelisted(config, 'Stripe Key')).toBe(true);
      // Match by itemId (second argument)
      expect(isItemWhitelisted(config, 'Unknown Title', 'abc123def456')).toBe(true);
      // Case-insensitive itemId matching
      expect(isItemWhitelisted(config, 'Unknown Title', 'ABC123DEF456')).toBe(true);
      // Neither title nor itemId matches
      expect(isItemWhitelisted(config, 'Unknown Title', 'unknown-id')).toBe(false);
      // No itemId provided, title doesn't match
      expect(isItemWhitelisted(config, 'Unknown Title')).toBe(false);
    });
  });

  // =============================================================================
  // GET ITEM CREDENTIAL REDACTION TESTS
  // =============================================================================
  describe('onepassword_get_item credential redaction', () => {
    it('should return error when elicitation is enabled but no mechanism available', async () => {
      // When elicitation is enabled but no mechanism (no native support, no HTTP fallback),
      // the elicitation library throws. The tool catches this and returns an error.
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_ELICITATION_READ = 'true';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should show full credentials when elicitation is disabled', async () => {
      process.env.ELICITATION_ENABLED = 'false';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should show full credentials for whitelisted item even with elicitation enabled', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      process.env.OP_WHITELISTED_ITEMS = 'Test Login';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });

    it('should show full credentials when item is whitelisted by ID with elicitation enabled', async () => {
      process.env.ELICITATION_ENABLED = 'true';
      // Whitelist by the mock item's ID rather than title
      process.env.OP_WHITELISTED_ITEMS = 'item-1';

      const tool = getItemTool(mockServer, () => mockClient);
      const result = await tool.handler({ itemId: 'item-1' });

      const item = JSON.parse(result.content[0].text);
      expect(item._credentialsRevealed).toBe(true);

      const passwordField = item.fields.find((f: { label: string }) => f.label === 'password');
      expect(passwordField.value).toBe('testpass123');
    });
  });
});
