/**
 * Manual Tests for DynamoDB MCP Server - Table Filtering Feature
 *
 * These tests verify that the DYNAMODB_ALLOWED_TABLES environment variable
 * correctly restricts access to only specified tables.
 *
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

// Generate unique table names to avoid conflicts
const ALLOWED_TABLE = `mcp-test-allowed-${Date.now()}`;
const DISALLOWED_TABLE = `mcp-test-disallowed-${Date.now()}`;

describe('DynamoDB Table Filtering Manual Tests', () => {
  let restrictedClient: TestMCPClient;
  let adminClient: TestMCPClient;

  beforeAll(async () => {
    // Validate required env vars
    if (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION) {
      throw new Error('AWS_REGION or AWS_DEFAULT_REGION must be set');
    }

    const baseEnv = {
      ...process.env,
      AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
    };

    // Admin client without table restrictions (for setup and cleanup)
    adminClient = new TestMCPClient({
      serverPath,
      env: baseEnv,
    });
    await adminClient.connect();

    // Restricted client with table filtering enabled
    restrictedClient = new TestMCPClient({
      serverPath,
      env: {
        ...baseEnv,
        DYNAMODB_ALLOWED_TABLES: ALLOWED_TABLE,
      },
    });
    await restrictedClient.connect();

    // Create both test tables using admin client
    await adminClient.callTool('dynamodb_create_table', {
      tableName: ALLOWED_TABLE,
      keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
      attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
      billingMode: 'PAY_PER_REQUEST',
    });

    await adminClient.callTool('dynamodb_create_table', {
      tableName: DISALLOWED_TABLE,
      keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
      attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
      billingMode: 'PAY_PER_REQUEST',
    });

    // Wait for tables to become active
    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  afterAll(async () => {
    // Clean up test tables using admin client
    if (adminClient) {
      try {
        await adminClient.callTool('dynamodb_delete_table', { tableName: ALLOWED_TABLE });
      } catch {
        // Ignore cleanup errors
      }
      try {
        await adminClient.callTool('dynamodb_delete_table', { tableName: DISALLOWED_TABLE });
      } catch {
        // Ignore cleanup errors
      }
      await adminClient.disconnect();
    }

    if (restrictedClient) {
      await restrictedClient.disconnect();
    }
  });

  describe('list_tables filtering', () => {
    it('should only show allowed tables in list_tables', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_list_tables',
        {}
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      // Should include allowed table
      expect(parsed.tableNames).toContain(ALLOWED_TABLE);

      // Should NOT include disallowed table
      expect(parsed.tableNames).not.toContain(DISALLOWED_TABLE);
    });
  });

  describe('Access to allowed table', () => {
    it('should allow describe_table on allowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_describe_table',
        { tableName: ALLOWED_TABLE }
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableName).toBe(ALLOWED_TABLE);
    });

    it('should allow put_item on allowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_put_item',
        {
          tableName: ALLOWED_TABLE,
          item: { pk: 'test-1', name: 'Test Item' },
        }
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it('should allow get_item on allowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_get_item',
        {
          tableName: ALLOWED_TABLE,
          key: { pk: 'test-1' },
        }
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('Test Item');
    });

    it('should allow scan on allowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_scan_table',
        { tableName: ALLOWED_TABLE }
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Access denied on disallowed table', () => {
    it('should deny describe_table on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_describe_table',
        { tableName: DISALLOWED_TABLE }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain(DISALLOWED_TABLE);
    });

    it('should deny put_item on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_put_item',
        {
          tableName: DISALLOWED_TABLE,
          item: { pk: 'test-1', name: 'Should Fail' },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny get_item on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_get_item',
        {
          tableName: DISALLOWED_TABLE,
          key: { pk: 'test-1' },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny scan on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_scan_table',
        { tableName: DISALLOWED_TABLE }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny query on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_query_items',
        {
          tableName: DISALLOWED_TABLE,
          keyConditionExpression: 'pk = :pk',
          expressionAttributeValues: { ':pk': 'test-1' },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny update_item on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_update_item',
        {
          tableName: DISALLOWED_TABLE,
          key: { pk: 'test-1' },
          updateExpression: 'SET #name = :name',
          expressionAttributeNames: { '#name': 'name' },
          expressionAttributeValues: { ':name': 'Should Fail' },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny delete_item on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_delete_item',
        {
          tableName: DISALLOWED_TABLE,
          key: { pk: 'test-1' },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should deny delete_table on disallowed table', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_delete_table',
        { tableName: DISALLOWED_TABLE }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });
  });

  describe('Batch operations with mixed tables', () => {
    it('should deny batch_get_items when any table is disallowed', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_batch_get_items',
        {
          requestItems: {
            [ALLOWED_TABLE]: { keys: [{ pk: 'test-1' }] },
            [DISALLOWED_TABLE]: { keys: [{ pk: 'test-1' }] },
          },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain(DISALLOWED_TABLE);
    });

    it('should deny batch_write_items when any table is disallowed', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_batch_write_items',
        {
          requestItems: {
            [ALLOWED_TABLE]: [{ putRequest: { item: { pk: 'batch-1' } } }],
            [DISALLOWED_TABLE]: [{ putRequest: { item: { pk: 'batch-1' } } }],
          },
        }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain(DISALLOWED_TABLE);
    });
  });

  describe('Cleanup allowed table', () => {
    it('should allow delete_item on allowed table to clean up', async () => {
      const result = await restrictedClient.callTool<{ type: string; text: string }>(
        'dynamodb_delete_item',
        {
          tableName: ALLOWED_TABLE,
          key: { pk: 'test-1' },
        }
      );

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });
  });
});
