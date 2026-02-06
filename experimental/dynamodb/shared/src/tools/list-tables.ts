import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { filterAllowedTables } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  exclusiveStartTableName:
    'Name of the last evaluated table from a previous request. Use for pagination.',
  limit: 'Maximum number of tables to return (1-100). Default: 100',
} as const;

export const ListTablesSchema = z.object({
  exclusiveStartTableName: z
    .string()
    .optional()
    .describe(PARAM_DESCRIPTIONS.exclusiveStartTableName),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
});

const TOOL_DESCRIPTION = `List all DynamoDB tables in the configured AWS region.

Returns a list of table names with optional pagination support.

**Returns:**
- tableNames: Array of table name strings
- lastEvaluatedTableName: Name to use for pagination (if more tables exist)

**Use cases:**
- Discover available tables in the account
- Enumerate tables for backup or migration operations
- Check if a specific table exists

**Note:** Results are paginated. Use lastEvaluatedTableName with exclusiveStartTableName for large table lists.`;

export function listTablesTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_list_tables' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        exclusiveStartTableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.exclusiveStartTableName,
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.limit,
        },
      },
      required: [] as string[],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListTablesSchema.parse(args);
        const client = clientFactory();

        const result = await client.listTables(
          validatedArgs.exclusiveStartTableName,
          validatedArgs.limit
        );

        // Filter tables based on allowed tables configuration
        const filteredTableNames = filterAllowedTables(result.tableNames || [], tableConfig);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...result,
                  tableNames: filteredTableNames,
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
              text: `Error listing tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
