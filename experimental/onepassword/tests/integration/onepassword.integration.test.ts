import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockOnePasswordClient } from '../../shared/src/onepassword-client/onepassword-client.integration-mock.js';
import type { IOnePasswordClient } from '../../shared/src/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('1Password MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('onepassword-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const tools = await client.listTools();
      expect(tools.length).toBeGreaterThanOrEqual(6);

      const toolNames = tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('onepassword_list_vaults');
      expect(toolNames).toContain('onepassword_list_items');
      expect(toolNames).toContain('onepassword_get_item');
      expect(toolNames).toContain('onepassword_list_items_by_tag');
      expect(toolNames).toContain('onepassword_create_login');
      expect(toolNames).toContain('onepassword_create_secure_note');
    });

    it('should list vaults', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('onepassword_list_vaults', {});
      const vaults = JSON.parse((result as { content: { text: string }[] }).content[0].text);

      expect(vaults).toHaveLength(2);
      expect(vaults[0].name).toBe('Personal');
    });

    it('should list items in a vault', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('onepassword_list_items', {
        vaultId: 'vault-1',
      });
      const items = JSON.parse((result as { content: { text: string }[] }).content[0].text);

      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('Test Login');
    });

    it('should get item details', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('onepassword_get_item', {
        itemId: 'item-1',
      });
      const item = JSON.parse((result as { content: { text: string }[] }).content[0].text);

      expect(item.id).toBe('item-1');
      expect(item.title).toBe('Test Login');
      expect(item.fields).toBeDefined();
    });

    it('should create a login item', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('onepassword_create_login', {
        vaultId: 'vault-1',
        title: 'New Test Login',
        username: 'testuser',
        password: 'testpass123',
      });
      const item = JSON.parse((result as { content: { text: string }[] }).content[0].text);

      expect(item.title).toBe('New Test Login');
      expect(item.category).toBe('LOGIN');
    });

    it('should create a secure note', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('onepassword_create_secure_note', {
        vaultId: 'vault-1',
        title: 'API Key',
        content: 'sk-abc123',
      });
      const item = JSON.parse((result as { content: { text: string }[] }).content[0].text);

      expect(item.title).toBe('API Key');
      expect(item.category).toBe('SECURE_NOTE');
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const resources = await client.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('onepassword://config');
    });

    it('should read config resource', async () => {
      const mockClient = createIntegrationMockOnePasswordClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.readResource('onepassword://config');
      const config = JSON.parse(result.contents[0].text);

      expect(config.server.name).toBe('onepassword-mcp-server');
      expect(config.capabilities.tools).toBe(true);
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked 1Password client.
 */
async function createTestMCPClientWithMock(
  mockClient: IOnePasswordClient & { mockData?: unknown }
): Promise<TestMCPClient> {
  const mockData = mockClient.mockData || {};
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      ONEPASSWORD_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
