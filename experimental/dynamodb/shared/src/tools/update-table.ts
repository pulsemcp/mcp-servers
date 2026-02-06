import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';
import { TableFilterConfig } from '../types.js';
import { isTableAllowed, createTableAccessDeniedError } from '../tools.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the table to update',
  billingMode:
    'Change billing mode: "PAY_PER_REQUEST" for on-demand or "PROVISIONED" for fixed capacity',
  provisionedThroughput:
    'New provisioned capacity. Required when switching to PROVISIONED billing. Example: {"readCapacityUnits": 10, "writeCapacityUnits": 10}',
} as const;

export const UpdateTableSchema = z.object({
  tableName: z.string().min(1).describe(PARAM_DESCRIPTIONS.tableName),
  billingMode: z
    .enum(['PROVISIONED', 'PAY_PER_REQUEST'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.billingMode),
  provisionedThroughput: z
    .object({
      readCapacityUnits: z.number().min(1),
      writeCapacityUnits: z.number().min(1),
    })
    .optional()
    .describe(PARAM_DESCRIPTIONS.provisionedThroughput),
});

const TOOL_DESCRIPTION = `Update a DynamoDB table's settings.

Modify table billing mode and provisioned capacity settings.

**Supported Updates:**
- Switch between PAY_PER_REQUEST and PROVISIONED billing modes
- Adjust read/write capacity units (for PROVISIONED tables)

**Returns:**
- tableName: Name of updated table
- tableStatus: Status after update (usually UPDATING)

**Use cases:**
- Scale up capacity for high-traffic periods
- Switch to on-demand billing for variable workloads
- Reduce costs by switching to provisioned billing
- Adjust capacity based on usage patterns

**Note:**
- Updates are asynchronous. Check describeTable for when status becomes ACTIVE.
- You can only switch billing modes once per 24 hours.
- GSI updates require separate globalSecondaryIndexUpdates (not supported in this simplified tool).`;

export function updateTableTool(
  _server: Server,
  clientFactory: () => IDynamoDBClient,
  tableFilterConfig?: TableFilterConfig
) {
  const tableConfig = tableFilterConfig || {};

  return {
    name: 'dynamodb_update_table' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tableName,
        },
        billingMode: {
          type: 'string',
          enum: ['PROVISIONED', 'PAY_PER_REQUEST'],
          description: PARAM_DESCRIPTIONS.billingMode,
        },
        provisionedThroughput: {
          type: 'object',
          properties: {
            readCapacityUnits: { type: 'number', minimum: 1 },
            writeCapacityUnits: { type: 'number', minimum: 1 },
          },
          required: ['readCapacityUnits', 'writeCapacityUnits'],
          description: PARAM_DESCRIPTIONS.provisionedThroughput,
        },
      },
      required: ['tableName'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UpdateTableSchema.parse(args);

        // Check table access
        if (!isTableAllowed(validatedArgs.tableName, tableConfig)) {
          return createTableAccessDeniedError(validatedArgs.tableName);
        }

        const client = clientFactory();

        // At least one update parameter must be provided
        if (!validatedArgs.billingMode && !validatedArgs.provisionedThroughput) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: At least one of billingMode or provisionedThroughput must be provided',
              },
            ],
            isError: true,
          };
        }

        // Validate that provisioned throughput is provided when billing mode is PROVISIONED
        if (validatedArgs.billingMode === 'PROVISIONED' && !validatedArgs.provisionedThroughput) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: provisionedThroughput is required when billingMode is PROVISIONED',
              },
            ],
            isError: true,
          };
        }

        const result = await client.updateTable({
          tableName: validatedArgs.tableName,
          billingMode: validatedArgs.billingMode,
          provisionedThroughput: validatedArgs.provisionedThroughput,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  tableName: result.tableName,
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
              text: `Error updating table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
