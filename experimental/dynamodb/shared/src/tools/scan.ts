import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  limit: 'Maximum number of items to evaluate (not necessarily return due to filters)',
  exclusiveStartKey: 'Primary key of the item to start after (for pagination)',
  filterExpression: 'Filter expression to apply. Example: "#status = :active AND age > :minAge"',
  expressionAttributeNames:
    'Substitutions for reserved words in expressions. Example: {"#status": "status"}',
  expressionAttributeValues:
    'Values for expression placeholders. Example: {":active": "ACTIVE", ":minAge": 18}',
  projectionExpression:
    'Comma-separated list of attributes to retrieve. Example: "userId, name, email"',
} as const;

export const ScanSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  limit: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.limit),
  exclusiveStartKey: z
    .record(z.unknown())
    .optional()
    .describe(PARAM_DESCRIPTIONS.exclusiveStartKey),
  filterExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.filterExpression),
  expressionAttributeNames: z
    .record(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeNames),
  expressionAttributeValues: z
    .record(z.unknown())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeValues),
  projectionExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.projectionExpression),
});

const TOOL_DESCRIPTION = `Scan all items in a DynamoDB table with optional filtering.

Reads every item in the table and applies optional filters. Use with caution on large tables.

**Returns:**
- items: Array of items (after filtering)
- count: Number of items returned
- scannedCount: Number of items evaluated (before filtering)
- lastEvaluatedKey: Key for pagination (if more results exist)

**Use cases:**
- Export all data from a table
- Find items when partition key is unknown
- Perform analytics on entire dataset
- One-time data migrations

**Warning:** Scan reads every item in the table, consuming significant read capacity. Use Query when possible. For large tables, always use pagination with limit and exclusiveStartKey.`;

export function scanTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_scan' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
        limit: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.limit,
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
        expressionAttributeNames: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.expressionAttributeNames,
          additionalProperties: { type: 'string' },
        },
        expressionAttributeValues: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.expressionAttributeValues,
          additionalProperties: true,
        },
        projectionExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.projectionExpression,
        },
      },
      required: ['tableName'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ScanSchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        const result = await client.scan(validatedArgs.tableName, {
          limit: validatedArgs.limit,
          exclusiveStartKey: validatedArgs.exclusiveStartKey,
          filterExpression: validatedArgs.filterExpression,
          expressionAttributeNames: validatedArgs.expressionAttributeNames,
          expressionAttributeValues: validatedArgs.expressionAttributeValues,
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
              text: `Error scanning table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
