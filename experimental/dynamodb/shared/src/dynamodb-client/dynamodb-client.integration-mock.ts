// Integration Mock for DynamoDB Client
// Used in integration tests with TestMCPClient

import {
  IDynamoDBClient,
  ListTablesResult,
  DescribeTableResult,
  CreateTableParams,
  CreateTableResult,
  DeleteTableResult,
  UpdateTableParams,
  UpdateTableResult,
  GetItemResult,
  PutItemOptions,
  PutItemResult,
  UpdateItemOptions,
  UpdateItemResult,
  DeleteItemOptions,
  DeleteItemResult,
  QueryParams,
  QueryResult,
  ScanParams,
  ScanResult,
  BatchGetParams,
  BatchGetResult,
  BatchWriteParams,
  BatchWriteResult,
} from './dynamodb-client.js';

export interface MockDynamoDBData {
  tables?: Record<string, MockTableData>;
}

export interface MockTableData {
  name: string;
  status?: string;
  keySchema?: Array<{ attributeName: string; keyType: 'HASH' | 'RANGE' }>;
  attributeDefinitions?: Array<{ attributeName: string; attributeType: 'S' | 'N' | 'B' }>;
  items?: Record<string, unknown>[];
}

/**
 * Create an integration mock DynamoDB client.
 * This is a plain TypeScript mock (not using vi.fn()) for use in integration tests.
 */
export function createIntegrationMockDynamoDBClient(
  mockData: MockDynamoDBData = {}
): IDynamoDBClient {
  const tables = mockData.tables || {};

  return {
    async listTables(
      _exclusiveStartTableName?: string,
      _limit?: number
    ): Promise<ListTablesResult> {
      return {
        tableNames: Object.keys(tables),
        lastEvaluatedTableName: undefined,
      };
    },

    async describeTable(tableName: string): Promise<DescribeTableResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      return {
        tableName: table.name,
        tableStatus: table.status || 'ACTIVE',
        keySchema: table.keySchema?.map((k) => ({
          AttributeName: k.attributeName,
          KeyType: k.keyType,
        })),
        attributeDefinitions: table.attributeDefinitions?.map((a) => ({
          AttributeName: a.attributeName,
          AttributeType: a.attributeType,
        })),
        itemCount: table.items?.length || 0,
        tableSizeBytes: 0,
      };
    },

    async createTable(params: CreateTableParams): Promise<CreateTableResult> {
      tables[params.tableName] = {
        name: params.tableName,
        status: 'CREATING',
        keySchema: params.keySchema,
        attributeDefinitions: params.attributeDefinitions,
        items: [],
      };

      return {
        tableName: params.tableName,
        tableStatus: 'CREATING',
      };
    },

    async deleteTable(tableName: string): Promise<DeleteTableResult> {
      if (!tables[tableName]) {
        throw new Error(`Table ${tableName} not found`);
      }

      delete tables[tableName];

      return {
        tableName,
        tableStatus: 'DELETING',
      };
    },

    async updateTable(params: UpdateTableParams): Promise<UpdateTableResult> {
      if (!tables[params.tableName]) {
        throw new Error(`Table ${params.tableName} not found`);
      }

      return {
        tableName: params.tableName,
        tableStatus: 'UPDATING',
      };
    },

    async getItem(tableName: string, key: Record<string, unknown>): Promise<GetItemResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      const item = table.items?.find((item) => {
        return Object.entries(key).every(([k, v]) => item[k] === v);
      });

      return { item };
    },

    async putItem(
      tableName: string,
      item: Record<string, unknown>,
      _options?: PutItemOptions
    ): Promise<PutItemResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      if (!table.items) {
        table.items = [];
      }
      table.items.push(item);

      return {};
    },

    async updateItem(
      tableName: string,
      _key: Record<string, unknown>,
      _options: UpdateItemOptions
    ): Promise<UpdateItemResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      return {};
    },

    async deleteItem(
      tableName: string,
      key: Record<string, unknown>,
      _options?: DeleteItemOptions
    ): Promise<DeleteItemResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      const index = table.items?.findIndex((item) => {
        return Object.entries(key).every(([k, v]) => item[k] === v);
      });

      if (index !== undefined && index >= 0 && table.items) {
        table.items.splice(index, 1);
      }

      return {};
    },

    async query(tableName: string, _options: QueryParams): Promise<QueryResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      // Return all items for mock (simplified)
      const items = table.items || [];

      return {
        items,
        count: items.length,
        scannedCount: items.length,
      };
    },

    async scan(tableName: string, _options?: ScanParams): Promise<ScanResult> {
      const table = tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      const items = table.items || [];

      return {
        items,
        count: items.length,
        scannedCount: items.length,
      };
    },

    async batchGetItems(params: BatchGetParams): Promise<BatchGetResult> {
      const responses: Record<string, Record<string, unknown>[]> = {};

      for (const [tableName, tableParams] of Object.entries(params.requestItems)) {
        const table = tables[tableName];
        if (!table) continue;

        responses[tableName] = [];
        for (const key of tableParams.keys) {
          const item = table.items?.find((item) => {
            return Object.entries(key).every(([k, v]) => item[k] === v);
          });
          if (item) {
            responses[tableName].push(item);
          }
        }
      }

      return { responses };
    },

    async batchWriteItems(_params: BatchWriteParams): Promise<BatchWriteResult> {
      return {};
    },
  };
}
