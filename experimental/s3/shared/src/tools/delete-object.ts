import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the S3 bucket (e.g., "my-app-data")',
  key: 'The object key (path) to delete (e.g., "logs/2024/01/old-data.json")',
} as const;

export const DeleteObjectSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  key: z.string().min(1).describe(PARAM_DESCRIPTIONS.key),
});

export function deleteObjectTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 'delete_object',
    description: `Delete an object from S3.

Permanently removes the specified object from the bucket.

Example response:
{
  "success": true,
  "message": "Object deleted: s3://my-bucket/path/to/file.txt"
}

Use cases:
- Remove outdated files
- Clean up temporary data
- Delete processed files
- Remove incorrect uploads

Note: This operation is irreversible. For versioned buckets, this creates a delete marker.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        key: { type: 'string', description: PARAM_DESCRIPTIONS.key },
      },
      required: ['bucket', 'key'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = DeleteObjectSchema.parse(args);
        const client = clientFactory();
        await client.deleteObject(validated.bucket, validated.key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Object deleted: s3://${validated.bucket}/${validated.key}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error deleting object: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
