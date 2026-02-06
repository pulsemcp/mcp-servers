import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  key: 'Primary key of the item to update. Example: {"userId": "123"}',
  updateExpression:
    'Update expression defining modifications. Use SET, REMOVE, ADD, DELETE actions. Example: "SET #name = :newName, #count = #count + :inc REMOVE #oldAttr"',
  expressionAttributeNames:
    'Substitutions for reserved words or attribute names. Example: {"#name": "name", "#count": "viewCount"}',
  expressionAttributeValues:
    'Values for expression placeholders. Example: {":newName": "John Doe", ":inc": 1}',
  conditionExpression:
    'Condition that must be satisfied for the update to succeed. Example: "attribute_exists(userId)"',
  returnValues:
    'What to return: "NONE", "UPDATED_OLD", "UPDATED_NEW", "ALL_OLD", or "ALL_NEW". Default: "NONE"',
} as const;

export const UpdateItemSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  key: z.record(z.unknown()).describe(PARAM_DESCRIPTIONS.key),
  updateExpression: z.string().min(1).describe(PARAM_DESCRIPTIONS.updateExpression),
  expressionAttributeNames: z
    .record(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeNames),
  expressionAttributeValues: z
    .record(z.unknown())
    .optional()
    .describe(PARAM_DESCRIPTIONS.expressionAttributeValues),
  conditionExpression: z.string().optional().describe(PARAM_DESCRIPTIONS.conditionExpression),
  returnValues: z
    .enum(['NONE', 'UPDATED_OLD', 'UPDATED_NEW', 'ALL_OLD', 'ALL_NEW'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.returnValues),
});

const TOOL_DESCRIPTION = `Update specific attributes of an existing item in a DynamoDB table.

Modifies only the specified attributes, leaving other attributes unchanged. Creates the item if it doesn't exist (upsert behavior).

**Update Expression Actions:**
- SET: Add or modify attributes. Example: "SET #name = :val"
- REMOVE: Delete attributes. Example: "REMOVE #oldAttr"
- ADD: Increment numbers or add to sets. Example: "ADD #count :one"
- DELETE: Remove elements from sets. Example: "DELETE #tags :tagToRemove"

**Returns:**
- attributes: Item values based on returnValues setting

**Use cases:**
- Increment counters atomically
- Update user profile fields
- Append to lists
- Toggle feature flags

**Note:** UpdateItem is atomic and supports conditional updates for optimistic locking.`;

export function updateItemTool(_server: Server, clientFactory: () => IDynamoDBClient) {
  return {
    name: 'dynamodb_update_item' as const,
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
        updateExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.updateExpression,
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
        conditionExpression: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.conditionExpression,
        },
        returnValues: {
          type: 'string',
          enum: ['NONE', 'UPDATED_OLD', 'UPDATED_NEW', 'ALL_OLD', 'ALL_NEW'],
          description: PARAM_DESCRIPTIONS.returnValues,
        },
      },
      required: ['tableName', 'key', 'updateExpression'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UpdateItemSchema.parse(args);
        const client = clientFactory();

        const result = await client.updateItem(validatedArgs.tableName, validatedArgs.key, {
          updateExpression: validatedArgs.updateExpression,
          expressionAttributeNames: validatedArgs.expressionAttributeNames,
          expressionAttributeValues: validatedArgs.expressionAttributeValues,
          conditionExpression: validatedArgs.conditionExpression,
          returnValues: validatedArgs.returnValues,
        });

        return {
          content: [
            {
              type: 'text',
              text: result.attributes
                ? JSON.stringify({ success: true, attributes: result.attributes }, null, 2)
                : JSON.stringify({ success: true }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
