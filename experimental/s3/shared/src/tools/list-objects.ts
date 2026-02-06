import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the S3 bucket (e.g., "my-app-data")',
  prefix: 'Filter objects by key prefix (e.g., "logs/2024/" to list only objects in that folder)',
  maxKeys: 'Maximum number of objects to return (1-1000, default: 1000)',
  continuationToken: 'Token for pagination, returned from previous list request when truncated',
  delimiter:
    'Character to group keys (e.g., "/" to simulate folders). Common prefixes are returned separately.',
} as const;

export const ListObjectsSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  prefix: z.string().optional().describe(PARAM_DESCRIPTIONS.prefix),
  maxKeys: z.number().min(1).max(1000).optional().describe(PARAM_DESCRIPTIONS.maxKeys),
  continuationToken: z.string().optional().describe(PARAM_DESCRIPTIONS.continuationToken),
  delimiter: z.string().optional().describe(PARAM_DESCRIPTIONS.delimiter),
});

export function listObjectsTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 'list_objects',
    description: `List objects in an S3 bucket with optional prefix filtering and pagination.

Example response:
{
  "objects": [
    {"key": "data/file1.json", "size": 1234, "lastModified": "2024-03-01T10:00:00Z"},
    {"key": "data/file2.json", "size": 5678, "lastModified": "2024-03-02T11:00:00Z"}
  ],
  "commonPrefixes": ["data/subdir/"],
  "isTruncated": false
}

Use cases:
- Browse bucket contents
- Find files matching a prefix pattern
- List "folders" using delimiter
- Paginate through large buckets`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        prefix: { type: 'string', description: PARAM_DESCRIPTIONS.prefix },
        maxKeys: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
          description: PARAM_DESCRIPTIONS.maxKeys,
        },
        continuationToken: { type: 'string', description: PARAM_DESCRIPTIONS.continuationToken },
        delimiter: { type: 'string', description: PARAM_DESCRIPTIONS.delimiter },
      },
      required: ['bucket'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ListObjectsSchema.parse(args);
        const client = clientFactory();
        const result = await client.listObjects(validated.bucket, {
          prefix: validated.prefix,
          maxKeys: validated.maxKeys,
          continuationToken: validated.continuationToken,
          delimiter: validated.delimiter,
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
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error listing objects: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
