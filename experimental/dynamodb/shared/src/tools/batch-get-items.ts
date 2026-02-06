import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';

const PARAM_DESCRIPTIONS = {
  requestItems:
    'Map of table names to keys to retrieve. Each table entry contains an array of keys. Example: {"Users": {"keys": [{"userId": "1"}, {"userId": "2"}]}, "Orders": {"keys": [{"orderId": "abc"}]}}',
} as const;

export const BatchGetItemsSchema = z.object({
  requestItems: z
    .record(
      z.object({
        keys: z.array(z.record(z.unknown())),
        projectionExpression: z.string().optional(),
        expressionAttributeNames: z.record(z.string()).optional(),
      })
    )
    .describe(PARAM_DESCRIPTIONS.requestItems),
});

const TOOL_DESCRIPTION = `Retrieve multiple items from one or more DynamoDB tables in a single request.

Efficiently fetches up to 100 items across multiple tables using their primary keys.

**Returns:**
- responses: Map of table names to arrays of retrieved items
- unprocessedKeys: Keys that could not be processed (retry these)

**Use cases:**
- Fetch multiple user profiles at once
- Load related data from different tables
- Resolve references in batch

**Note:** Maximum 100 items per request. Unprocessed keys should be retried with exponential backoff.`;

export function batchGetItemsTool(_server: Server, clientFactory: () => IDynamoDBClient) {
  return {
    name: 'dynamodb_batch_get_items' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        requestItems: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.requestItems,
          additionalProperties: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
              projectionExpression: { type: 'string' },
              expressionAttributeNames: {
                type: 'object',
                additionalProperties: { type: 'string' },
              },
            },
            required: ['keys'],
          },
        },
      },
      required: ['requestItems'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = BatchGetItemsSchema.parse(args);
        const client = clientFactory();

        const result = await client.batchGetItems({
          requestItems: validatedArgs.requestItems,
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
              text: `Error batch getting items: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
