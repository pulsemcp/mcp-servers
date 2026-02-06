import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the table to delete',
} as const;

export const DeleteTableSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
});

const TOOL_DESCRIPTION = `Delete a DynamoDB table and all its data.

**WARNING:** This is a destructive operation. All data in the table will be permanently deleted.

**Returns:**
- tableName: Name of deleted table
- tableStatus: Status after deletion (usually DELETING)

**Use cases:**
- Clean up test tables
- Remove deprecated tables
- Environment teardown

**Note:**
- Table deletion is asynchronous. The table may take a few minutes to fully delete.
- You cannot delete a table that is currently being created or updated.
- Once deleted, data cannot be recovered unless you have backups.`;

export function deleteTableTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'delete_table' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
      },
      required: ['tableName'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteTableSchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        const result = await client.deleteTable(validatedArgs.tableName);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Table "${result.tableName}" deletion initiated`,
                  tableStatus: result.tableStatus,
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
              text: `Error deleting table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
