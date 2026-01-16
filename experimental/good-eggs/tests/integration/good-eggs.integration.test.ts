import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Integration tests for Good Eggs MCP Server
 *
 * Note: These tests use a mock client factory injected via environment variables
 * to avoid actual browser automation during CI. The tests verify the MCP protocol
 * handling and tool registration, not the actual Good Eggs website interaction.
 */
describe('Good Eggs MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and return server info', async () => {
      client = await createTestMCPClient();

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('good-eggs-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list all available tools', async () => {
      client = await createTestMCPClient();

      const tools = await client.listTools();
      expect(tools.length).toBe(11);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('search_for_grocery');
      expect(toolNames).toContain('get_favorites');
      expect(toolNames).toContain('get_grocery_details');
      expect(toolNames).toContain('add_to_cart');
      expect(toolNames).toContain('search_for_freebie_groceries');
      expect(toolNames).toContain('get_list_of_past_order_dates');
      expect(toolNames).toContain('get_past_order_groceries');
      expect(toolNames).toContain('add_favorite');
      expect(toolNames).toContain('remove_favorite');
      expect(toolNames).toContain('remove_from_cart');
      expect(toolNames).toContain('get_cart');
    });

    it('should have correct input schemas for search_for_grocery', async () => {
      client = await createTestMCPClient();

      const tools = await client.listTools();
      const searchTool = tools.find((t) => t.name === 'search_for_grocery');

      expect(searchTool).toBeDefined();
      expect(searchTool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          query: {
            type: 'string',
          },
        },
        required: ['query'],
      });
    });

    it('should have correct input schemas for add_to_cart', async () => {
      client = await createTestMCPClient();

      const tools = await client.listTools();
      const addToCartTool = tools.find((t) => t.name === 'add_to_cart');

      expect(addToCartTool).toBeDefined();
      expect(addToCartTool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          grocery_url: {
            type: 'string',
          },
          quantity: {
            type: 'number',
          },
        },
        required: ['grocery_url'],
      });
    });

    it('should execute search_for_grocery with mock client', async () => {
      client = await createTestMCPClient();

      const result = await client.callTool('search_for_grocery', {
        query: 'apples',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
      // Should contain results from mock
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('Found');
    });

    it('should execute get_favorites with mock client', async () => {
      client = await createTestMCPClient();

      const result = await client.callTool('get_favorites', {});

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
    });
  });
});

/**
 * Helper function to create a TestMCPClient with mocked Good Eggs client
 */
async function createTestMCPClient(): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      // Use mock mode for integration tests
      GOOD_EGGS_MOCK_MODE: 'true',
    },
    debug: false,
  });

  await client.connect();
  return client;
}
