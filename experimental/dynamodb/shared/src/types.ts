// DynamoDB MCP Server Types

import {
  AttributeValue,
  KeySchemaElement,
  AttributeDefinition,
  GlobalSecondaryIndex,
  LocalSecondaryIndex,
  BillingMode,
} from '@aws-sdk/client-dynamodb';

// =============================================================================
// DynamoDB-specific types
// =============================================================================

export interface DynamoDBItem {
  [key: string]: AttributeValue;
}

export interface TableDescription {
  tableName: string;
  tableStatus?: string;
  creationDateTime?: Date;
  itemCount?: number;
  tableSizeBytes?: number;
  keySchema?: KeySchemaElement[];
  attributeDefinitions?: AttributeDefinition[];
  billingMode?: BillingMode;
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
  localSecondaryIndexes?: LocalSecondaryIndex[];
}

export interface QueryOptions {
  indexName?: string;
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: Record<string, AttributeValue>;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, AttributeValue>;
  projectionExpression?: string;
}

export interface ScanOptions {
  limit?: number;
  exclusiveStartKey?: Record<string, AttributeValue>;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, AttributeValue>;
  projectionExpression?: string;
}

export interface CreateTableOptions {
  tableName: string;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
  billingMode?: BillingMode;
  provisionedThroughput?: {
    readCapacityUnits: number;
    writeCapacityUnits: number;
  };
  globalSecondaryIndexes?: GlobalSecondaryIndex[];
  localSecondaryIndexes?: LocalSecondaryIndex[];
}

export interface UpdateItemOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, AttributeValue>;
  conditionExpression?: string;
  returnValues?: 'NONE' | 'UPDATED_OLD' | 'UPDATED_NEW' | 'ALL_OLD' | 'ALL_NEW';
}

export interface PutItemOptions {
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, AttributeValue>;
  returnValues?: 'NONE' | 'ALL_OLD';
}

export interface DeleteItemOptions {
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, AttributeValue>;
  returnValues?: 'NONE' | 'ALL_OLD';
}

// =============================================================================
// Tool configuration types
// =============================================================================

/**
 * Available tool groups for permission-based access control.
 * - 'readonly': Tools that only read data (describe, get, query, scan, list)
 * - 'readwrite': Tools that modify data (put, update, delete items)
 * - 'admin': Tools that manage table structure (create, delete tables)
 */
export type ToolGroup = 'readonly' | 'readwrite' | 'admin';

/**
 * Individual tool names for fine-grained enable/disable control.
 * Note: Tool names don't include a server prefix since MCP clients typically
 * prefix tool names with the server name automatically.
 */
export type DynamoDBToolName =
  // Readonly tools
  | 'list_tables'
  | 'describe_table'
  | 'get_item'
  | 'query_items'
  | 'scan_table'
  | 'batch_get_items'
  // ReadWrite tools
  | 'put_item'
  | 'update_item'
  | 'delete_item'
  | 'batch_write_items'
  // Admin tools
  | 'create_table'
  | 'delete_table'
  | 'update_table';

/**
 * Configuration for tool filtering.
 */
export interface ToolFilterConfig {
  enabledToolGroups?: ToolGroup[];
  enabledTools?: DynamoDBToolName[];
  disabledTools?: DynamoDBToolName[];
}

/**
 * Configuration for table access control.
 * When allowedTables is set, operations are restricted to only those tables.
 */
export interface TableFilterConfig {
  allowedTables?: string[];
}

/**
 * Combined server configuration.
 */
export interface ServerConfig {
  toolFilter?: ToolFilterConfig;
  tableFilter?: TableFilterConfig;
}
