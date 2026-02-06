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
 */
export type DynamoDBToolName =
  // Readonly tools
  | 'dynamodb_list_tables'
  | 'dynamodb_describe_table'
  | 'dynamodb_get_item'
  | 'dynamodb_query'
  | 'dynamodb_scan'
  | 'dynamodb_batch_get_items'
  // ReadWrite tools
  | 'dynamodb_put_item'
  | 'dynamodb_update_item'
  | 'dynamodb_delete_item'
  | 'dynamodb_batch_write_items'
  // Admin tools
  | 'dynamodb_create_table'
  | 'dynamodb_delete_table'
  | 'dynamodb_update_table';

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
