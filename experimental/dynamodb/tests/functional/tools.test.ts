import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFunctionalMockDynamoDBClient } from '../mocks/dynamodb-client.functional-mock.js';
import type { IDynamoDBClient } from '../../shared/src/dynamodb-client/dynamodb-client.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

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

describe('DynamoDB Tools', () => {
  let mockClient: IDynamoDBClient;
  let mockServer: Server;
  let clientFactory: () => IDynamoDBClient;

  beforeEach(() => {
    mockClient = createFunctionalMockDynamoDBClient();
    mockServer = {} as Server;
    clientFactory = () => mockClient;
  });

  describe('listTablesTool', () => {
    it('should list tables', async () => {
      const tables = ['table1', 'table2', 'table3'];
      (mockClient.listTables as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableNames: tables,
      });

      const tool = listTablesTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('table1');
      expect(result.content[0].text).toContain('table2');
      expect(result.content[0].text).toContain('table3');
    });

    it('should handle pagination parameters', async () => {
      const tool = listTablesTool(mockServer, clientFactory);
      await tool.handler({ exclusiveStartTableName: 'lastTable', limit: 10 });

      expect(mockClient.listTables).toHaveBeenCalledWith('lastTable', 10);
    });
  });

  describe('describeTableTool', () => {
    it('should describe a table', async () => {
      (mockClient.describeTable as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableName: 'Users',
        tableStatus: 'ACTIVE',
        itemCount: 1000,
        tableSizeBytes: 50000,
      });

      const tool = describeTableTool(mockServer, clientFactory);
      const result = await tool.handler({ tableName: 'Users' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Users');
      expect(result.content[0].text).toContain('ACTIVE');
    });

    it('should handle missing table', async () => {
      (mockClient.describeTable as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Table not found')
      );

      const tool = describeTableTool(mockServer, clientFactory);
      const result = await tool.handler({ tableName: 'NonExistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Table not found');
    });
  });

  describe('getItemTool', () => {
    it('should get an item', async () => {
      const item = { userId: '123', name: 'John Doe', email: 'john@example.com' };
      (mockClient.getItem as ReturnType<typeof vi.fn>).mockResolvedValue({ item });

      const tool = getItemTool(mockServer, clientFactory);
      const result = await tool.handler({ tableName: 'Users', key: { userId: '123' } });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('John Doe');
    });

    it('should handle item not found', async () => {
      (mockClient.getItem as ReturnType<typeof vi.fn>).mockResolvedValue({ item: undefined });

      const tool = getItemTool(mockServer, clientFactory);
      const result = await tool.handler({ tableName: 'Users', key: { userId: 'notfound' } });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Item not found');
    });
  });

  describe('putItemTool', () => {
    it('should put an item', async () => {
      const tool = putItemTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'Users',
        item: { userId: '123', name: 'John' },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('success');
      expect(mockClient.putItem).toHaveBeenCalledWith(
        'Users',
        { userId: '123', name: 'John' },
        expect.any(Object)
      );
    });
  });

  describe('queryTool', () => {
    it('should query items', async () => {
      const items = [
        { userId: '123', orderId: 'order1' },
        { userId: '123', orderId: 'order2' },
      ];
      (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        items,
        count: 2,
        scannedCount: 2,
      });

      const tool = queryTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'Orders',
        keyConditionExpression: 'userId = :uid',
        expressionAttributeValues: { ':uid': '123' },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('order1');
      expect(result.content[0].text).toContain('order2');
    });
  });

  describe('scanTool', () => {
    it('should scan a table', async () => {
      const items = [{ userId: '1' }, { userId: '2' }, { userId: '3' }];
      (mockClient.scan as ReturnType<typeof vi.fn>).mockResolvedValue({
        items,
        count: 3,
        scannedCount: 3,
      });

      const tool = scanTool(mockServer, clientFactory);
      const result = await tool.handler({ tableName: 'Users' });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBe(3);
    });

    it('should apply filters', async () => {
      const tool = scanTool(mockServer, clientFactory);
      await tool.handler({
        tableName: 'Users',
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
        limit: 10,
      });

      expect(mockClient.scan).toHaveBeenCalledWith('Users', {
        filterExpression: '#status = :active',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: { ':active': 'ACTIVE' },
        limit: 10,
        exclusiveStartKey: undefined,
        projectionExpression: undefined,
      });
    });
  });

  describe('updateItemTool', () => {
    it('should update an item', async () => {
      (mockClient.updateItem as ReturnType<typeof vi.fn>).mockResolvedValue({
        attributes: { userId: '123', name: 'Updated Name' },
      });

      const tool = updateItemTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'Users',
        key: { userId: '123' },
        updateExpression: 'SET #name = :name',
        expressionAttributeNames: { '#name': 'name' },
        expressionAttributeValues: { ':name': 'Updated Name' },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('deleteItemTool', () => {
    it('should delete an item', async () => {
      (mockClient.deleteItem as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const tool = deleteItemTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'Users',
        key: { userId: '123' },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('createTableTool', () => {
    it('should create a table', async () => {
      (mockClient.createTable as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableName: 'NewTable',
        tableStatus: 'CREATING',
      });

      const tool = createTableTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'NewTable',
        keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
        attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
        billingMode: 'PAY_PER_REQUEST',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('NewTable');
      expect(result.content[0].text).toContain('CREATING');
    });
  });

  describe('deleteTableTool', () => {
    it('should delete a table', async () => {
      (mockClient.deleteTable as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableName: 'OldTable',
        tableStatus: 'DELETING',
      });

      const tool = deleteTableTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'OldTable',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('OldTable');
    });
  });

  describe('updateTableTool', () => {
    it('should update a table', async () => {
      (mockClient.updateTable as ReturnType<typeof vi.fn>).mockResolvedValue({
        tableName: 'ExistingTable',
        tableStatus: 'UPDATING',
      });

      const tool = updateTableTool(mockServer, clientFactory);
      const result = await tool.handler({
        tableName: 'ExistingTable',
        billingMode: 'PROVISIONED',
        provisionedThroughput: {
          readCapacityUnits: 5,
          writeCapacityUnits: 5,
        },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('ExistingTable');
    });
  });

  describe('batchGetItemsTool', () => {
    it('should batch get items', async () => {
      (mockClient.batchGetItems as ReturnType<typeof vi.fn>).mockResolvedValue({
        responses: {
          Users: [
            { userId: '1', name: 'Alice' },
            { userId: '2', name: 'Bob' },
          ],
        },
      });

      const tool = batchGetItemsTool(mockServer, clientFactory);
      const result = await tool.handler({
        requestItems: {
          Users: {
            keys: [{ userId: '1' }, { userId: '2' }],
          },
        },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Alice');
      expect(result.content[0].text).toContain('Bob');
    });
  });

  describe('batchWriteItemsTool', () => {
    it('should batch write items', async () => {
      (mockClient.batchWriteItems as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const tool = batchWriteItemsTool(mockServer, clientFactory);
      const result = await tool.handler({
        requestItems: {
          Users: [
            { putRequest: { item: { userId: '1', name: 'Alice' } } },
            { deleteRequest: { key: { userId: '2' } } },
          ],
        },
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('success');
    });
  });
});
