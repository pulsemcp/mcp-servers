import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IDynamoDBClient } from '../dynamodb-client/dynamodb-client.js';

const PARAM_DESCRIPTIONS = {
  tableName: 'Name of the table to create (3-255 characters)',
  keySchema:
    'Primary key schema. Array of {attributeName, keyType}. Must have one HASH key, optionally one RANGE key. Example: [{"attributeName": "userId", "keyType": "HASH"}, {"attributeName": "timestamp", "keyType": "RANGE"}]',
  attributeDefinitions:
    'Attribute type definitions for key schema attributes. Array of {attributeName, attributeType}. Types: "S" (String), "N" (Number), "B" (Binary). Example: [{"attributeName": "userId", "attributeType": "S"}, {"attributeName": "timestamp", "attributeType": "N"}]',
  billingMode:
    '"PAY_PER_REQUEST" for on-demand or "PROVISIONED" for fixed capacity. Default: PAY_PER_REQUEST',
  provisionedThroughput:
    'Required if billingMode is PROVISIONED. Object with readCapacityUnits and writeCapacityUnits. Example: {"readCapacityUnits": 5, "writeCapacityUnits": 5}',
} as const;

export const CreateTableSchema = z.object({
  tableName: z.string().min(3).max(255).describe(PARAM_DESCRIPTIONS.tableName),
  keySchema: z
    .array(
      z.object({
        attributeName: z.string().min(1),
        keyType: z.enum(['HASH', 'RANGE']),
      })
    )
    .min(1)
    .max(2)
    .describe(PARAM_DESCRIPTIONS.keySchema),
  attributeDefinitions: z
    .array(
      z.object({
        attributeName: z.string().min(1),
        attributeType: z.enum(['S', 'N', 'B']),
      })
    )
    .min(1)
    .describe(PARAM_DESCRIPTIONS.attributeDefinitions),
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

const TOOL_DESCRIPTION = `Create a new DynamoDB table.

Creates a table with the specified primary key schema and billing mode.

**Key Schema:**
- HASH key (partition key): Required. Determines data distribution.
- RANGE key (sort key): Optional. Enables range queries within a partition.

**Attribute Types:**
- S: String
- N: Number (stored as string, supports arbitrary precision)
- B: Binary (base64-encoded)

**Returns:**
- tableName: Name of created table
- tableStatus: Initial status (usually CREATING)

**Use cases:**
- Set up new application tables
- Create tables for different environments
- Provision test fixtures

**Note:** Table creation is asynchronous. Use describeTable to check when status becomes ACTIVE.`;

export function createTableTool(_server: Server, clientFactory: () => IDynamoDBClient) {
  return {
    name: 'dynamodb_create_table' as const,
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        tableName: {
          type: 'string',
          minLength: 3,
          maxLength: 255,
          description: PARAM_DESCRIPTIONS.tableName,
        },
        keySchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              attributeName: { type: 'string' },
              keyType: { type: 'string', enum: ['HASH', 'RANGE'] },
            },
            required: ['attributeName', 'keyType'],
          },
          minItems: 1,
          maxItems: 2,
          description: PARAM_DESCRIPTIONS.keySchema,
        },
        attributeDefinitions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              attributeName: { type: 'string' },
              attributeType: { type: 'string', enum: ['S', 'N', 'B'] },
            },
            required: ['attributeName', 'attributeType'],
          },
          minItems: 1,
          description: PARAM_DESCRIPTIONS.attributeDefinitions,
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
      required: ['tableName', 'keySchema', 'attributeDefinitions'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateTableSchema.parse(args);
        const client = clientFactory();

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

        const result = await client.createTable({
          tableName: validatedArgs.tableName,
          keySchema: validatedArgs.keySchema,
          attributeDefinitions: validatedArgs.attributeDefinitions,
          billingMode: validatedArgs.billingMode,
          provisionedThroughput: validatedArgs.provisionedThroughput,
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
              text: `Error creating table: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
