// DynamoDB Client Interface and Implementation

import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
  CreateTableCommand,
  DeleteTableCommand,
  UpdateTableCommand,
  KeySchemaElement,
  AttributeDefinition,
  GlobalSecondaryIndexUpdate,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB Client Interface
 * Defines all operations available for interacting with DynamoDB.
 */
export interface IDynamoDBClient {
  // Table operations
  listTables(exclusiveStartTableName?: string, limit?: number): Promise<ListTablesResult>;
  describeTable(tableName: string): Promise<DescribeTableResult>;
  createTable(params: CreateTableParams): Promise<CreateTableResult>;
  deleteTable(tableName: string): Promise<DeleteTableResult>;
  updateTable(params: UpdateTableParams): Promise<UpdateTableResult>;

  // Item operations
  getItem(tableName: string, key: Record<string, unknown>): Promise<GetItemResult>;
  putItem(
    tableName: string,
    item: Record<string, unknown>,
    options?: PutItemOptions
  ): Promise<PutItemResult>;
  updateItem(
    tableName: string,
    key: Record<string, unknown>,
    options: UpdateItemOptions
  ): Promise<UpdateItemResult>;
  deleteItem(
    tableName: string,
    key: Record<string, unknown>,
    options?: DeleteItemOptions
  ): Promise<DeleteItemResult>;

  // Query and scan
  query(tableName: string, options: QueryParams): Promise<QueryResult>;
  scan(tableName: string, options?: ScanParams): Promise<ScanResult>;

  // Batch operations
  batchGetItems(params: BatchGetParams): Promise<BatchGetResult>;
  batchWriteItems(params: BatchWriteParams): Promise<BatchWriteResult>;
}

// =============================================================================
// Parameter and Result Types
// =============================================================================

export interface ListTablesResult {
  tableNames: string[];
  lastEvaluatedTableName?: string;
}

export interface DescribeTableResult {
  tableName: string;
  tableStatus?: string;
  creationDateTime?: Date;
  itemCount?: number;
  tableSizeBytes?: number;
  keySchema?: KeySchemaElement[];
  attributeDefinitions?: AttributeDefinition[];
  billingModeSummary?: {
    billingMode?: string;
  };
  provisionedThroughput?: {
    readCapacityUnits?: number;
    writeCapacityUnits?: number;
  };
  globalSecondaryIndexes?: Array<{
    indexName?: string;
    keySchema?: KeySchemaElement[];
    projection?: {
      projectionType?: string;
      nonKeyAttributes?: string[];
    };
    indexStatus?: string;
    itemCount?: number;
  }>;
  localSecondaryIndexes?: Array<{
    indexName?: string;
    keySchema?: KeySchemaElement[];
    projection?: {
      projectionType?: string;
      nonKeyAttributes?: string[];
    };
  }>;
}

export interface CreateTableParams {
  tableName: string;
  keySchema: Array<{ attributeName: string; keyType: 'HASH' | 'RANGE' }>;
  attributeDefinitions: Array<{ attributeName: string; attributeType: 'S' | 'N' | 'B' }>;
  billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
  provisionedThroughput?: {
    readCapacityUnits: number;
    writeCapacityUnits: number;
  };
}

export interface CreateTableResult {
  tableName: string;
  tableStatus?: string;
}

export interface DeleteTableResult {
  tableName: string;
  tableStatus?: string;
}

export interface UpdateTableParams {
  tableName: string;
  billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
  provisionedThroughput?: {
    readCapacityUnits: number;
    writeCapacityUnits: number;
  };
  globalSecondaryIndexUpdates?: GlobalSecondaryIndexUpdate[];
}

export interface UpdateTableResult {
  tableName: string;
  tableStatus?: string;
}

export interface GetItemResult {
  item?: Record<string, unknown>;
}

export interface PutItemOptions {
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  returnValues?: 'NONE' | 'ALL_OLD';
}

export interface PutItemResult {
  attributes?: Record<string, unknown>;
}

export interface UpdateItemOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  conditionExpression?: string;
  returnValues?: 'NONE' | 'UPDATED_OLD' | 'UPDATED_NEW' | 'ALL_OLD' | 'ALL_NEW';
}

export interface UpdateItemResult {
  attributes?: Record<string, unknown>;
}

export interface DeleteItemOptions {
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  returnValues?: 'NONE' | 'ALL_OLD';
}

export interface DeleteItemResult {
  attributes?: Record<string, unknown>;
}

export interface QueryParams {
  keyConditionExpression: string;
  expressionAttributeValues: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  indexName?: string;
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: Record<string, unknown>;
  filterExpression?: string;
  projectionExpression?: string;
}

export interface QueryResult {
  items: Record<string, unknown>[];
  count: number;
  scannedCount: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface ScanParams {
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  projectionExpression?: string;
}

export interface ScanResult {
  items: Record<string, unknown>[];
  count: number;
  scannedCount: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface BatchGetParams {
  requestItems: Record<
    string,
    {
      keys: Record<string, unknown>[];
      projectionExpression?: string;
      expressionAttributeNames?: Record<string, string>;
    }
  >;
}

export interface BatchGetResult {
  responses: Record<string, Record<string, unknown>[]>;
  unprocessedKeys?: Record<
    string,
    {
      keys: Record<string, unknown>[];
    }
  >;
}

export interface BatchWriteParams {
  requestItems: Record<
    string,
    Array<
      | { putRequest: { item: Record<string, unknown> } }
      | { deleteRequest: { key: Record<string, unknown> } }
    >
  >;
}

export interface BatchWriteResult {
  unprocessedItems?: Record<
    string,
    Array<
      | { putRequest: { item: Record<string, unknown> } }
      | { deleteRequest: { key: Record<string, unknown> } }
    >
  >;
}

// =============================================================================
// DynamoDB Client Implementation
// =============================================================================

export interface DynamoDBClientConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export class DynamoDBClientImpl implements IDynamoDBClient {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  constructor(config: DynamoDBClientConfig) {
    const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
      region: config.region,
    };

    // Use explicit credentials if provided, otherwise SDK will use default credential chain
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    // Allow custom endpoint (useful for local DynamoDB or LocalStack)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }

  async listTables(exclusiveStartTableName?: string, limit?: number): Promise<ListTablesResult> {
    const command = new ListTablesCommand({
      ExclusiveStartTableName: exclusiveStartTableName,
      Limit: limit,
    });

    const response = await this.client.send(command);

    return {
      tableNames: response.TableNames || [],
      lastEvaluatedTableName: response.LastEvaluatedTableName,
    };
  }

  async describeTable(tableName: string): Promise<DescribeTableResult> {
    const command = new DescribeTableCommand({ TableName: tableName });
    const response = await this.client.send(command);
    const table = response.Table;

    if (!table) {
      throw new Error(`Table ${tableName} not found`);
    }

    return {
      tableName: table.TableName || tableName,
      tableStatus: table.TableStatus,
      creationDateTime: table.CreationDateTime,
      itemCount: table.ItemCount,
      tableSizeBytes: table.TableSizeBytes,
      keySchema: table.KeySchema,
      attributeDefinitions: table.AttributeDefinitions,
      billingModeSummary: table.BillingModeSummary
        ? { billingMode: table.BillingModeSummary.BillingMode }
        : undefined,
      provisionedThroughput: table.ProvisionedThroughput
        ? {
            readCapacityUnits: table.ProvisionedThroughput.ReadCapacityUnits,
            writeCapacityUnits: table.ProvisionedThroughput.WriteCapacityUnits,
          }
        : undefined,
      globalSecondaryIndexes: table.GlobalSecondaryIndexes?.map((gsi) => ({
        indexName: gsi.IndexName,
        keySchema: gsi.KeySchema,
        projection: gsi.Projection
          ? {
              projectionType: gsi.Projection.ProjectionType,
              nonKeyAttributes: gsi.Projection.NonKeyAttributes,
            }
          : undefined,
        indexStatus: gsi.IndexStatus,
        itemCount: gsi.ItemCount,
      })),
      localSecondaryIndexes: table.LocalSecondaryIndexes?.map((lsi) => ({
        indexName: lsi.IndexName,
        keySchema: lsi.KeySchema,
        projection: lsi.Projection
          ? {
              projectionType: lsi.Projection.ProjectionType,
              nonKeyAttributes: lsi.Projection.NonKeyAttributes,
            }
          : undefined,
      })),
    };
  }

  async createTable(params: CreateTableParams): Promise<CreateTableResult> {
    const command = new CreateTableCommand({
      TableName: params.tableName,
      KeySchema: params.keySchema.map((k) => ({
        AttributeName: k.attributeName,
        KeyType: k.keyType,
      })),
      AttributeDefinitions: params.attributeDefinitions.map((a) => ({
        AttributeName: a.attributeName,
        AttributeType: a.attributeType,
      })),
      BillingMode: params.billingMode,
      ProvisionedThroughput: params.provisionedThroughput
        ? {
            ReadCapacityUnits: params.provisionedThroughput.readCapacityUnits,
            WriteCapacityUnits: params.provisionedThroughput.writeCapacityUnits,
          }
        : undefined,
    });

    const response = await this.client.send(command);

    return {
      tableName: response.TableDescription?.TableName || params.tableName,
      tableStatus: response.TableDescription?.TableStatus,
    };
  }

  async deleteTable(tableName: string): Promise<DeleteTableResult> {
    const command = new DeleteTableCommand({ TableName: tableName });
    const response = await this.client.send(command);

    return {
      tableName: response.TableDescription?.TableName || tableName,
      tableStatus: response.TableDescription?.TableStatus,
    };
  }

  async updateTable(params: UpdateTableParams): Promise<UpdateTableResult> {
    const command = new UpdateTableCommand({
      TableName: params.tableName,
      BillingMode: params.billingMode,
      ProvisionedThroughput: params.provisionedThroughput
        ? {
            ReadCapacityUnits: params.provisionedThroughput.readCapacityUnits,
            WriteCapacityUnits: params.provisionedThroughput.writeCapacityUnits,
          }
        : undefined,
      GlobalSecondaryIndexUpdates: params.globalSecondaryIndexUpdates,
    });

    const response = await this.client.send(command);

    return {
      tableName: response.TableDescription?.TableName || params.tableName,
      tableStatus: response.TableDescription?.TableStatus,
    };
  }

  async getItem(tableName: string, key: Record<string, unknown>): Promise<GetItemResult> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });

    const response = await this.docClient.send(command);

    return {
      item: response.Item as Record<string, unknown> | undefined,
    };
  }

  async putItem(
    tableName: string,
    item: Record<string, unknown>,
    options?: PutItemOptions
  ): Promise<PutItemResult> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues,
    });

    const response = await this.docClient.send(command);

    return {
      attributes: response.Attributes as Record<string, unknown> | undefined,
    };
  }

  async updateItem(
    tableName: string,
    key: Record<string, unknown>,
    options: UpdateItemOptions
  ): Promise<UpdateItemResult> {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: options.updateExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ConditionExpression: options.conditionExpression,
      ReturnValues: options.returnValues,
    });

    const response = await this.docClient.send(command);

    return {
      attributes: response.Attributes as Record<string, unknown> | undefined,
    };
  }

  async deleteItem(
    tableName: string,
    key: Record<string, unknown>,
    options?: DeleteItemOptions
  ): Promise<DeleteItemResult> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
      ConditionExpression: options?.conditionExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ReturnValues: options?.returnValues,
    });

    const response = await this.docClient.send(command);

    return {
      attributes: response.Attributes as Record<string, unknown> | undefined,
    };
  }

  async query(tableName: string, options: QueryParams): Promise<QueryResult> {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: options.keyConditionExpression,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ExpressionAttributeNames: options.expressionAttributeNames,
      IndexName: options.indexName,
      Limit: options.limit,
      ScanIndexForward: options.scanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
      FilterExpression: options.filterExpression,
      ProjectionExpression: options.projectionExpression,
    });

    const response = await this.docClient.send(command);

    return {
      items: (response.Items || []) as Record<string, unknown>[],
      count: response.Count || 0,
      scannedCount: response.ScannedCount || 0,
      lastEvaluatedKey: response.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  }

  async scan(tableName: string, options?: ScanParams): Promise<ScanResult> {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: options?.limit,
      ExclusiveStartKey: options?.exclusiveStartKey,
      FilterExpression: options?.filterExpression,
      ExpressionAttributeNames: options?.expressionAttributeNames,
      ExpressionAttributeValues: options?.expressionAttributeValues,
      ProjectionExpression: options?.projectionExpression,
    });

    const response = await this.docClient.send(command);

    return {
      items: (response.Items || []) as Record<string, unknown>[],
      count: response.Count || 0,
      scannedCount: response.ScannedCount || 0,
      lastEvaluatedKey: response.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  }

  async batchGetItems(params: BatchGetParams): Promise<BatchGetResult> {
    // Convert our request format to the SDK format
    const requestItems: Record<string, { Keys: Record<string, unknown>[] }> = {};

    for (const [tableName, tableParams] of Object.entries(params.requestItems)) {
      requestItems[tableName] = {
        Keys: tableParams.keys,
      };
    }

    const command = new BatchGetCommand({
      RequestItems: requestItems,
    });

    const response = await this.docClient.send(command);

    const responses: Record<string, Record<string, unknown>[]> = {};
    if (response.Responses) {
      for (const [tableName, items] of Object.entries(response.Responses)) {
        responses[tableName] = items as Record<string, unknown>[];
      }
    }

    return {
      responses,
      unprocessedKeys: response.UnprocessedKeys as BatchGetResult['unprocessedKeys'],
    };
  }

  async batchWriteItems(params: BatchWriteParams): Promise<BatchWriteResult> {
    // Convert our request format to the SDK format
    const requestItems: Record<
      string,
      Array<
        | { PutRequest: { Item: Record<string, unknown> } }
        | { DeleteRequest: { Key: Record<string, unknown> } }
      >
    > = {};

    for (const [tableName, requests] of Object.entries(params.requestItems)) {
      requestItems[tableName] = requests.map((req) => {
        if ('putRequest' in req) {
          return { PutRequest: { Item: req.putRequest.item } };
        } else {
          return { DeleteRequest: { Key: req.deleteRequest.key } };
        }
      });
    }

    const command = new BatchWriteCommand({
      RequestItems: requestItems,
    });

    const response = await this.docClient.send(command);

    return {
      unprocessedItems: response.UnprocessedItems as BatchWriteResult['unprocessedItems'],
    };
  }
}
