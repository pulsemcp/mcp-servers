import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the DynamoDB table to describe',
} as const;

export const DescribeTableSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
});

const TOOL_DESCRIPTION = `Get detailed information about a DynamoDB table.

Returns comprehensive metadata including key schema, indexes, provisioned throughput, and table status.

**Returns:**
- tableName: Table name
- tableStatus: Current status (ACTIVE, CREATING, UPDATING, DELETING)
- keySchema: Primary key definition (hash and range keys)
- attributeDefinitions: Attribute types for key schema
- billingMode: PAY_PER_REQUEST or PROVISIONED
- provisionedThroughput: Read/write capacity (if provisioned)
- globalSecondaryIndexes: GSI definitions and status
- localSecondaryIndexes: LSI definitions
- itemCount: Approximate number of items
- tableSizeBytes: Approximate table size

**Use cases:**
- Understand table structure before querying
- Check table status after modifications
- Verify index availability
- Monitor capacity and size`;

export function describeTableTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_describe_table' as const,
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
        const validatedArgs = DescribeTableSchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        const result = await client.describeTable(validatedArgs.tableName);

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
              text: `Error describing table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
