// Functional Mock for DynamoDB Client
// Uses Vitest mock functions for unit testing

import { vi } from 'vitest';
import type { IDynamoDBClient } from '../../shared/src/dynamodb-client/dynamodb-client.js';

/**
 * Create a functional mock DynamoDB client using vi.fn().
 * This allows tests to track calls and set up return values.
 */
export function createFunctionalMockDynamoDBClient(): IDynamoDBClient {
  return {
    listTables: vi.fn().mockResolvedValue({ tableNames: [], lastEvaluatedTableName: undefined }),
    describeTable: vi.fn().mockResolvedValue({
      tableName: 'test-table',
      tableStatus: 'ACTIVE',
      itemCount: 0,
      tableSizeBytes: 0,
    }),
    createTable: vi.fn().mockResolvedValue({ tableName: 'test-table', tableStatus: 'CREATING' }),
    deleteTable: vi.fn().mockResolvedValue({ tableName: 'test-table', tableStatus: 'DELETING' }),
    updateTable: vi.fn().mockResolvedValue({ tableName: 'test-table', tableStatus: 'UPDATING' }),
    getItem: vi.fn().mockResolvedValue({ item: undefined }),
    putItem: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
    deleteItem: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue({ items: [], count: 0, scannedCount: 0 }),
    scan: vi.fn().mockResolvedValue({ items: [], count: 0, scannedCount: 0 }),
    batchGetItems: vi.fn().mockResolvedValue({ responses: {} }),
    batchWriteItems: vi.fn().mockResolvedValue({}),
  };
}
