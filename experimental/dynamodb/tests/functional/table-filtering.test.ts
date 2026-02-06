import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFunctionalMockDynamoDBClient } from '../mocks/dynamodb-client.functional-mock.js';
import type { IDynamoDBClient } from '../../shared/src/dynamodb-client/dynamodb-client.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { TableFilterConfig } from '../../shared/src/types.js';

// Import tools
import { listTablesTool } from '../../shared/src/tools/list-tables.js';
import { describeTableTool } from '../../shared/src/tools/describe-table.js';
import { getItemTool } from '../../shared/src/tools/get-item.js';
import { putItemTool } from '../../shared/src/tools/put-item.js';
import { queryTool } from '../../shared/src/tools/query.js';
import { scanTool } from '../../shared/src/tools/scan.js';
import { updateItemTool } from '../../shared/src/tools/update-item.js';
import { deleteItemTool } from '../../shared/src/tools/delete-item.js';
import { createTableTool } from '../../shared/src/tools/create-table.js';
import { deleteTableTool } from '../../shared/src/tools/delete-table.js';
import { updateTableTool } from '../../shared/src/tools/update-table.js';
import { batchGetItemsTool } from '../../shared/src/tools/batch-get-items.js';
import { batchWriteItemsTool } from '../../shared/src/tools/batch-write-items.js';

// Import helper functions
import {
  parseTableFilterConfig,
  isTableAllowed,
  filterAllowedTables,
} from '../../shared/src/tools.js';

describe('Table Filtering', () => {
  let mockClient: IDynamoDBClient;
  let mockServer: Server;
  let clientFactory: () => IDynamoDBClient;

  beforeEach(() => {
    mockClient = createFunctionalMockDynamoDBClient();
    mockServer = {} as Server;
    clientFactory = () => mockClient;
    // Clear any env vars from previous tests
    delete process.env.DYNAMODB_ALLOWED_TABLES;
  });

  describe('parseTableFilterConfig', () => {
    it('should return empty config when env var not set', () => {
      const config = parseTableFilterConfig();
      expect(config.allowedTables).toBeUndefined();
    });

    it('should parse comma-separated table names', () => {
      process.env.DYNAMODB_ALLOWED_TABLES = 'Users,Orders,Products';
      const config = parseTableFilterConfig();
      expect(config.allowedTables).toEqual(['Users', 'Orders', 'Products']);
    });

    it('should trim whitespace from table names', () => {
      process.env.DYNAMODB_ALLOWED_TABLES = ' Users , Orders , Products ';
      const config = parseTableFilterConfig();
      expect(config.allowedTables).toEqual(['Users', 'Orders', 'Products']);
    });

    it('should filter out empty strings', () => {
      process.env.DYNAMODB_ALLOWED_TABLES = 'Users,,Orders,';
      const config = parseTableFilterConfig();
      expect(config.allowedTables).toEqual(['Users', 'Orders']);
    });

    it('should handle single table', () => {
      process.env.DYNAMODB_ALLOWED_TABLES = 'SingleTable';
      const config = parseTableFilterConfig();
      expect(config.allowedTables).toEqual(['SingleTable']);
    });
  });

  describe('isTableAllowed', () => {
    it('should allow any table when no filter is set', () => {
      const config: TableFilterConfig = {};
      expect(isTableAllowed('AnyTable', config)).toBe(true);
    });

    it('should allow any table when allowedTables is empty', () => {
      const config: TableFilterConfig = { allowedTables: [] };
      expect(isTableAllowed('AnyTable', config)).toBe(true);
    });

    it('should allow tables in the allowed list', () => {
      const config: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      expect(isTableAllowed('Users', config)).toBe(true);
      expect(isTableAllowed('Orders', config)).toBe(true);
    });

    it('should deny tables not in the allowed list', () => {
      const config: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      expect(isTableAllowed('Products', config)).toBe(false);
      expect(isTableAllowed('Customers', config)).toBe(false);
    });
  });

  describe('filterAllowedTables', () => {
    it('should return all tables when no filter is set', () => {
      const config: TableFilterConfig = {};
      const tables = ['Users', 'Orders', 'Products'];
      expect(filterAllowedTables(tables, config)).toEqual(tables);
    });

    it('should filter tables based on allowed list', () => {
      const config: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      const tables = ['Users', 'Orders', 'Products', 'Customers'];
      expect(filterAllowedTables(tables, config)).toEqual(['Users', 'Orders']);
    });
  });

  describe('listTablesTool with filtering', () => {
    it('should filter table list based on allowed tables', async () => {
      const allTables = ['Users', 'Orders', 'Products', 'Customers'];
      (mockClient.listTables as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableNames: allTables,
      });

      const tableConfig: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      const tool = listTablesTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableNames).toEqual(['Users', 'Orders']);
    });

    it('should return all tables when no filter is configured', async () => {
      const allTables = ['Users', 'Orders', 'Products'];
      (mockClient.listTables as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableNames: allTables,
      });

      const tool = listTablesTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.tableNames).toEqual(allTables);
    });
  });

  describe('describeTableTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = describeTableTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Orders' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain('Orders');
      expect(mockClient.describeTable).not.toHaveBeenCalled();
    });

    it('should allow access to allowed table', async () => {
      (mockClient.describeTable as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableName: 'Users',
        tableStatus: 'ACTIVE',
      });

      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = describeTableTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Users' });

      expect(result.isError).toBeUndefined();
      expect(mockClient.describeTable).toHaveBeenCalledWith('Users');
    });
  });

  describe('getItemTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = getItemTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Orders', key: { id: '1' } });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.getItem).not.toHaveBeenCalled();
    });

    it('should allow access to allowed table', async () => {
      (mockClient.getItem as ReturnType<typeof vi.fn>).mockResolvedValue({
        item: { userId: '1' },
      });

      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = getItemTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Users', key: { userId: '1' } });

      expect(result.isError).toBeUndefined();
      expect(mockClient.getItem).toHaveBeenCalled();
    });
  });

  describe('putItemTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = putItemTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        item: { id: '1', name: 'Test' },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.putItem).not.toHaveBeenCalled();
    });
  });

  describe('queryTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = queryTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        keyConditionExpression: 'pk = :pk',
        expressionAttributeValues: { ':pk': '1' },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('scanTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = scanTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Orders' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.scan).not.toHaveBeenCalled();
    });
  });

  describe('updateItemTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = updateItemTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        key: { id: '1' },
        updateExpression: 'SET #name = :name',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.updateItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteItemTool with filtering', () => {
    it('should deny access to non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = deleteItemTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        key: { id: '1' },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.deleteItem).not.toHaveBeenCalled();
    });
  });

  describe('createTableTool with filtering', () => {
    it('should deny creating non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = createTableTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
        attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.createTable).not.toHaveBeenCalled();
    });
  });

  describe('deleteTableTool with filtering', () => {
    it('should deny deleting non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = deleteTableTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({ tableName: 'Orders' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.deleteTable).not.toHaveBeenCalled();
    });
  });

  describe('updateTableTool with filtering', () => {
    it('should deny updating non-allowed table', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = updateTableTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        tableName: 'Orders',
        billingMode: 'PAY_PER_REQUEST',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(mockClient.updateTable).not.toHaveBeenCalled();
    });
  });

  describe('batchGetItemsTool with filtering', () => {
    it('should deny access when any table is not allowed', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = batchGetItemsTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        requestItems: {
          Users: { keys: [{ userId: '1' }] },
          Orders: { keys: [{ orderId: '1' }] },
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain('Orders');
      expect(mockClient.batchGetItems).not.toHaveBeenCalled();
    });

    it('should allow access when all tables are allowed', async () => {
      (mockClient.batchGetItems as ReturnType<typeof vi.fn>).mockResolvedValue({
        responses: { Users: [{ userId: '1' }] },
      });

      const tableConfig: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      const tool = batchGetItemsTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        requestItems: {
          Users: { keys: [{ userId: '1' }] },
          Orders: { keys: [{ orderId: '1' }] },
        },
      });

      expect(result.isError).toBeUndefined();
      expect(mockClient.batchGetItems).toHaveBeenCalled();
    });
  });

  describe('batchWriteItemsTool with filtering', () => {
    it('should deny access when any table is not allowed', async () => {
      const tableConfig: TableFilterConfig = { allowedTables: ['Users'] };
      const tool = batchWriteItemsTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        requestItems: {
          Users: [{ putRequest: { item: { userId: '1' } } }],
          Orders: [{ putRequest: { item: { orderId: '1' } } }],
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
      expect(result.content[0].text).toContain('Orders');
      expect(mockClient.batchWriteItems).not.toHaveBeenCalled();
    });

    it('should allow access when all tables are allowed', async () => {
      (mockClient.batchWriteItems as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const tableConfig: TableFilterConfig = { allowedTables: ['Users', 'Orders'] };
      const tool = batchWriteItemsTool(mockServer, clientFactory, tableConfig);
      const result = await tool.handler({
        requestItems: {
          Users: [{ putRequest: { item: { userId: '1' } } }],
          Orders: [{ putRequest: { item: { orderId: '1' } } }],
        },
      });

      expect(result.isError).toBeUndefined();
      expect(mockClient.batchWriteItems).toHaveBeenCalled();
    });
  });
});
