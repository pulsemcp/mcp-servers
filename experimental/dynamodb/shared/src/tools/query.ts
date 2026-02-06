import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  keyConditionExpression:
    'Key condition expression. Must include partition key condition. Example: "userId = :uid" or "userId = :uid AND timestamp BETWEEN :start AND :end"',
  expressionAttributeValues:
    'Values for expression placeholders. Example: {":uid": "123", ":start": 1000, ":end": 2000}',
  expressionAttributeNames:
    'Substitutions for reserved words in expressions. Example: {"#status": "status"}',
  indexName: 'Name of a secondary index to query instead of the main table',
  limit: 'Maximum number of items to evaluate (not necessarily return due to filters)',
  scanIndexForward: 'true for ascending order, false for descending. Default: true',
  exclusiveStartKey: 'Primary key of the item to start after (for pagination)',
  filterExpression: 'Filter expression to apply after query. Example: "#status = :active"',
  projectionExpression:
    'Comma-separated list of attributes to retrieve. Example: "userId, name, email"',
} as const;

export const QuerySchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  keyConditionExpression: z.string().min(1).describe(PARAM_DESCRIPTIONS.keyConditionExpression),
  expressionAttributeValues: z
    .record(z.unknown())
    .describe(PARAM_DESCRIPTIONS.expressionAttributeValues),
  expressionAttributeNames: z
    .record(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeNames),
  indexName: z.string().optional().describe(PARAM_DESCRIPTIONS.indexName),
  limit: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.limit),
  scanIndexForward: z.boolean().optional().describe(PARAM_DESCRIPTIONS.scanIndexForward),
  exclusiveStartKey: z
    .record(z.unknown())
    .optional()
    .describe(PARAM_DESCRIPTIONS.exclusiveStartKey),
  filterExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.filterExpression),
  projectionExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.projectionExpression),
});

const TOOL_DESCRIPTION = `Query items from a DynamoDB table using key conditions.

Efficiently retrieves multiple items that share the same partition key, with optional sort key conditions.

**Returns:**
- items: Array of matching items
- count: Number of items returned
- scannedCount: Number of items evaluated (before filtering)
- lastEvaluatedKey: Key for pagination (if more results exist)

**Use cases:**
- Get all orders for a customer
- Retrieve messages in a time range
- Find products in a category with price filters
- Paginate through large result sets

**Note:** Query is more efficient than Scan. Always prefer Query when you know the partition key.`;

export function queryTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_query_items' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
        keyConditionExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.keyConditionExpression,
        },
        expressionAttributeValues: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.expressionAttributeValues,
          additionalProperties: true,
        },
        expressionAttributeNames: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.expressionAttributeNames,
          additionalProperties: { type: 'string' },
        },
        indexName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.indexName,
        },
        limit: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.limit,
        },
        scanIndexForward: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.scanIndexForward,
        },
        exclusiveStartKey: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.exclusiveStartKey,
          additionalProperties: true,
        },
        filterExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.filterExpression,
        },
        projectionExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.projectionExpression,
        },
      },
      required: ['tableName', 'keyConditionExpression', 'expressionAttributeValues'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = QuerySchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        const result = await client.query(validatedArgs.tableName, {
          keyConditionExpression: validatedArgs.keyConditionExpression,
          expressionAttributeValues: validatedArgs.expressionAttributeValues,
          expressionAttributeNames: validatedArgs.expressionAttributeNames,
          indexName: validatedArgs.indexName,
          limit: validatedArgs.limit,
          scanIndexForward: validatedArgs.scanIndexForward,
          exclusiveStartKey: validatedArgs.exclusiveStartKey,
          filterExpression: validatedArgs.filterExpression,
          projectionExpression: validatedArgs.projectionExpression,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error querying table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
