import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  item: 'The item to put. Must include primary key attributes. Example: {"userId": "123", "name": "John", "email": "john@example.com"}',
  conditionExpression:
    'Condition that must be satisfied for the put to succeed. Example: "attribute_not_exists(userId)" to prevent overwrites',
  expressionAttributeNames:
    'Substitutions for reserved words in condition. Example: {"#status": "status"}',
  expressionAttributeValues:
    'Values for condition expression placeholders. Example: {":expected": "PENDING"}',
  returnValues: 'What to return: "NONE" (default) or "ALL_OLD" (previous item if overwritten)',
} as const;

export const PutItemSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  item: z.record(z.unknown()).describe(PARAM_DESCRIPTIONS.item),
  conditionExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.conditionExpression),
  expressionAttributeNames: z
    .record(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeNames),
  expressionAttributeValues: z
    .record(z.unknown())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeValues),
  returnValues: z.enum(['NONE', 'ALL_OLD']).optional().describe(PARAM_DESCRIPTIONS.returnValues),
});

const TOOL_DESCRIPTION = `Create a new item or replace an existing item in a DynamoDB table.

Writes the entire item. If an item with the same primary key exists, it will be completely replaced.

**Returns:**
- attributes: Previous item values (if returnValues is "ALL_OLD" and item existed)

**Use cases:**
- Create a new user record
- Store configuration settings
- Save document versions
- Update entire records

**Note:** PutItem replaces the entire item. Use UpdateItem to modify specific attributes without affecting others.`;

export function putItemTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'put_item' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
        item: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.item,
          additionalProperties: true,
        },
        conditionExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.conditionExpression,
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
        returnValues: {
          type: 'string',
          enum: ['NONE', 'ALL_OLD'],
          description: PARAM_DESCRIPTIONS.returnValues,
        },
      },
      required: ['tableName', 'item'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = PutItemSchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        const result = await client.putItem(validatedArgs.tableName, validatedArgs.item, {
          conditionExpression: validatedArgs.conditionExpression,
          expressionAttributeNames: validatedArgs.expressionAttributeNames,
          expressionAttributeValues: validatedArgs.expressionAttributeValues,
          returnValues: validatedArgs.returnValues,
        });

        return {
          content: [
            {
              type: 'text',
              text: result.attributes
                ? JSON.stringify({ success: true, previousItem: result.attributes }, null, 2)
                : JSON.stringify({ success: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error putting item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
