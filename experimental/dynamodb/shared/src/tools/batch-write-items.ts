import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  requestItems:
    'Map of table names to write requests. Each table entry contains an array of PutRequest or DeleteRequest objects. Example: {"Users": [{"putRequest": {"item": {"userId": "1", "name": "John"}}}, {"deleteRequest": {"key": {"userId": "2"}}}]}',
} as const;

const RequestItemSchema = z.union([
  z.object({ putRequest: z.object({ item: z.record(z.unknown()) }) }),
  z.object({ deleteRequest: z.object({ key: z.record(z.unknown()) }) }),
]);

export const BatchWriteItemsSchema = z.object({
  requestItems: z.record(z.array(RequestItemSchema)).describe(PARAM_DESCRIPTIONS.requestItems),
});

const TOOL_DESCRIPTION = `Write or delete multiple items across one or more DynamoDB tables in a single request.

Efficiently performs up to 25 put or delete operations across multiple tables.

**Returns:**
- unprocessedItems: Requests that could not be processed (retry these)

**Use cases:**
- Bulk import data
- Clean up multiple records
- Sync data across tables
- Process batch operations atomically

**Note:** Maximum 25 items per request, each item up to 400KB. BatchWriteItem does not support conditional writes or returning old values. Unprocessed items should be retried with exponential backoff.`;

export function batchWriteItemsTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_batch_write_items' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        requestItems: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.requestItems,
          additionalProperties: {
            type: 'array',
            items: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    putRequest: {
                      type: 'object',
                      properties: {
                        item: { type: 'object', additionalProperties: true },
                      },
                      required: ['item'],
                    },
                  },
                  required: ['putRequest'],
                },
                {
                  type: 'object',
                  properties: {
                    deleteRequest: {
                      type: 'object',
                      properties: {
                        key: { type: 'object', additionalProperties: true },
                      },
                      required: ['key'],
                    },
                  },
                  required: ['deleteRequest'],
                },
              ],
            },
          },
        },
      },
      required: ['requestItems'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = BatchWriteItemsSchema.parse(args);

        // Check table access for all tables in the request
        const tableNames = Object.keys(validatedArgs.requestItems);
        for (const tableName of tableNames) {
          if (!isTableAllowed(tableName, tableConfig)) {
            return createTableAccessDeniedError(tableName);
          }
        }

        const client = clientFactory();

        const result = await client.batchWriteItems({
          requestItems: validatedArgs.requestItems,
        });

        const hasUnprocessed =
          result.unprocessedItems && Object.keys(result.unprocessedItems).length > 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  hasUnprocessedItems: hasUnprocessed,
                  unprocessedItems: result.unprocessedItems,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error batch writing items: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
