/**
 * Manual Tests for DynamoDB MCP Server
 *
 * These tests hit real AWS DynamoDB APIs.
 * Requires valid AWS credentials in .env file:
 *   - AWS_REGION
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *
 * Run with: npm run test:manual
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../../local/build/index.js');

// Generate unique table name to avoid conflicts
const TEST_TABLE_NAME = `mcp-test-${Date.now()}`;

describe('DynamoDB MCP Server Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    // Validate required env vars
    if (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) {
      throw new Error('AWS_REGION or AWS_DEFAULT_REGION must be set');
    }

    client = new TestMCPClient({
      serverPath,
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    // Clean up test table if it was created
    if (client) {
      try {
        await client.callTool('delete_table', { tableName: TEST_TABLE_NAME });
      } catch {
        // Table may not exist, ignore
      }
      await client.disconnect();
    }
  });

  describe('Read-only Operations', () => {
    it('should list tables', async () => {
      const result = await client.callTool<{ type: string; text: string }>('list_tables', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed.tableNames)).toBe(true);
    });
  });

  describe('Table Management', () => {
    it('should create a table', async () => {
      const result = await client.callTool<{ type: string; text: string }>('create_table', {
        tableName: TEST_TABLE_NAME,
        keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
        attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
        billingMode: 'PAY_PER_REQUEST',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableName).toBe(TEST_TABLE_NAME);
    });

    it('should describe the created table', async () => {
      // Wait for table to be active
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const result = await client.callTool<{ type: string; text: string }>('describe_table', {
        tableName: TEST_TABLE_NAME,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableName).toBe(TEST_TABLE_NAME);
    });
  });

  describe('Item Operations', () => {
    it('should put an item', async () => {
      // Wait for table to be fully active and ready for write operations
      // DynamoDB tables need time to become fully active after creation
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const result = await client.callTool<{ type: string; text: string }>('put_item', {
        tableName: TEST_TABLE_NAME,
        item: {
          pk: 'test-item-1',
          name: 'Test Item',
          createdAt: new Date().toISOString(),
        },
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should get the item', async () => {
      const result = await client.callTool<{ type: string; text: string }>('get_item', {
        tableName: TEST_TABLE_NAME,
        key: { pk: 'test-item-1' },
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pk).toBe('test-item-1');
      expect(parsed.name).toBe('Test Item');
    });

    it('should scan the table', async () => {
      const result = await client.callTool<{ type: string; text: string }>('scan_table', {
        tableName: TEST_TABLE_NAME,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBeGreaterThanOrEqual(1);
    });

    it('should update the item', async () => {
      const result = await client.callTool<{ type: string; text: string }>('update_item', {
        tableName: TEST_TABLE_NAME,
        key: { pk: 'test-item-1' },
        updateExpression: 'SET #name = :newName',
        expressionAttributeNames: { '#name': 'name' },
        expressionAttributeValues: { ':newName': 'Updated Item' },
        returnValues: 'ALL_NEW',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should delete the item', async () => {
      const result = await client.callTool<{ type: string; text: string }>('delete_item', {
        tableName: TEST_TABLE_NAME,
        key: { pk: 'test-item-1' },
        returnValues: 'ALL_OLD',
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should delete the test table', async () => {
      const result = await client.callTool<{ type: string; text: string }>('delete_table', {
        tableName: TEST_TABLE_NAME,
      });

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });
});
