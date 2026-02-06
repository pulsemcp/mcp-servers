import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table',
  key: 'Primary key of the item to retrieve. Object with partition key (and sort key if table has one). Example: {"userId": "123"} or {"userId": "123", "timestamp": 1234567890}',
} as const;

export const GetItemSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  key: z.record(z.unknown()).describe(PARAM_DESCRIPTIONS.key),
});

const TOOL_DESCRIPTION = `Retrieve a single item from a DynamoDB table by its primary key.

Performs a direct lookup using the item's primary key for fast, efficient reads.

**Returns:**
- item: The retrieved item as a JSON object, or undefined if not found

**Use cases:**
- Fetch a specific user record by ID
- Retrieve configuration by key
- Look up a transaction by ID
- Get the latest version of a document

**Note:** This is the most efficient way to retrieve a single item. Use Query for multiple items with the same partition key.`;

export function getItemTool(_server: Server, clientFactory: () => IDynamoDBClient) {
  return {
    name: 'dynamodb_get_item' as const,
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
      },
      required: ['tableName', 'key'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetItemSchema.parse(args);
        const client = clientFactory();

        const result = await client.getItem(validatedArgs.tableName, validatedArgs.key);

        if (!result.item) {
          return {
            content: [
              {
                type: 'text',
                text: 'Item not found',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.item, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
