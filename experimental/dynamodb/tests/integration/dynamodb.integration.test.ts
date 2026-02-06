import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../../local/build/index.integration-with-mock.js');

describe('DynamoDB MCP Server Integration', () => {
  let client: TestMCPClient;

  const mockData = {
    tables: {
      Users: {
        name: 'Users',
        status: 'ACTIVE',
        keySchema: [{ attributeName: 'userId', keyType: 'HASH' }],
        attributeDefinitions: [{ attributeName: 'userId', attributeType: 'S' }],
        items: [
          { userId: 'user1', name: 'Alice', email: 'alice@example.com' },
          { userId: 'user2', name: 'Bob', email: 'bob@example.com' },
        ],
      },
      Orders: {
        name: 'Orders',
        status: 'ACTIVE',
        keySchema: [
          { attributeName: 'userId', keyType: 'HASH' },
          { attributeName: 'orderId', keyType: 'RANGE' },
        ],
        items: [
          { userId: 'user1', orderId: 'order1', total: 100 },
          { userId: 'user1', orderId: 'order2', total: 200 },
        ],
      },
    },
  };

  beforeAll(async () => {
    client = new TestMCPClient({
      serverPath,
      env: {
        DYNAMODB_MOCK_DATA: JSON.stringify(mockData),
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Tool Discovery', () => {
    it('should list all DynamoDB tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t: { name: string }) => t.name);

      // Readonly tools
      expect(toolNames).toContain('list_tables');
      expect(toolNames).toContain('describe_table');
      expect(toolNames).toContain('get_item');
      expect(toolNames).toContain('query_items');
      expect(toolNames).toContain('scan_table');

      // ReadWrite tools
      expect(toolNames).toContain('put_item');
      expect(toolNames).toContain('update_item');
      expect(toolNames).toContain('delete_item');

      // Admin tools
      expect(toolNames).toContain('create_table');
      expect(toolNames).toContain('delete_table');
    });
  });

  describe('Table Operations', () => {
    it('should list tables', async () => {
      const result = await client.callTool<{ type: string; text: string }>('list_tables', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.tableNames).toContain('Users');
      expect(parsed.tableNames).toContain('Orders');
    });

    it('should describe a table', async () => {
      const result = await client.callTool<{ type: string; text: string }>('describe_table', {
        tableName: 'Users',
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.tableName).toBe('Users');
      expect(parsed.tableStatus).toBe('ACTIVE');
    });
  });

  describe('Item Operations', () => {
    it('should get an item by key', async () => {
      const result = await client.callTool<{ type: string; text: string }>('get_item', {
        tableName: 'Users',
        key: { userId: 'user1' },
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.name).toBe('Alice');
      expect(parsed.email).toBe('alice@example.com');
    });

    it('should scan a table', async () => {
      const result = await client.callTool<{ type: string; text: string }>('scan_table', {
        tableName: 'Users',
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.count).toBe(2);
      expect(parsed.items.length).toBe(2);
    });

    it('should put a new item', async () => {
      const result = await client.callTool<{ type: string; text: string }>('put_item', {
        tableName: 'Users',
        item: { userId: 'user3', name: 'Charlie', email: 'charlie@example.com' },
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.success).toBe(true);
    });
  });

  describe('Resource Operations', () => {
    it('should list resources', async () => {
      const result = await client.listResources();
      const uris = result.resources.map((r: { uri: string }) => r.uri);

      expect(uris).toContain('dynamodb://config');
    });

    it('should read config resource', async () => {
      const result = await client.readResource<{ text: string }>('dynamodb://config');
      const config = JSON.parse(result.contents[0].text);

      expect(config.server.name).toBe('dynamodb-mcp-server');
      expect(config.toolGroups).toBeDefined();
      expect(config.toolGroups.readonly).toContain('list_tables');
    });
  });
});
