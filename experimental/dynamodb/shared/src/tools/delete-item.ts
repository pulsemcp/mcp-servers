import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  key: 'Primary key of the item to delete. Example: {"userId": "123"} or {"userId": "123", "timestamp": 1234567890}',
  conditionExpression:
    'Condition that must be satisfied for the delete to succeed. Example: "#status = :inactive"',
  expressionAttributeNames:
    'Substitutions for reserved words in condition. Example: {"#status": "status"}',
  expressionAttributeValues:
    'Values for condition expression placeholders. Example: {":inactive": "INACTIVE"}',
  returnValues: 'What to return: "NONE" (default) or "ALL_OLD" (deleted item)',
} as const;

export const DeleteItemSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  key: z.record(z.unknown()).describe(PARAM_DESCRIPTIONS.key),
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

const TOOL_DESCRIPTION = `Delete a single item from a DynamoDB table by its primary key.

Removes the item if it exists. Succeeds silently if the item doesn't exist (unless conditionExpression fails).

**Returns:**
- attributes: The deleted item's attributes (if returnValues is "ALL_OLD" and item existed)

**Use cases:**
- Remove a user account
- Delete expired sessions
- Clean up temporary records
- Remove processed queue items

**Note:** Use conditionExpression to ensure you only delete items in expected states (e.g., "attribute_exists(userId)").`;

export function deleteItemTool(_server: Server, clientFactory: () => IDynamoDBClient) {
  return {
    name: 'dynamodb_delete_item' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
        key: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.key,
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
      required: ['tableName', 'key'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteItemSchema.parse(args);
        const client = clientFactory();

        const result = await client.deleteItem(validatedArgs.tableName, validatedArgs.key, {
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
                ? JSON.stringify({ success: true, deletedItem: result.attributes }, null, 2)
                : JSON.stringify({ success: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
