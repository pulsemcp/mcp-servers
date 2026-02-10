import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the bucket to delete (e.g., "my-old-bucket")',
} as const;

export const DeleteBucketSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
});

export function deleteBucketTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'delete_bucket',
    description: `Delete a GCS bucket.

Permanently removes the specified bucket. The bucket must be empty before deletion.

Example response:
{
  "success": true,
  "message": "Bucket deleted: my-old-bucket"
}

Use cases:
- Clean up unused buckets
- Remove test/temporary buckets
- Decommission old storage

Note: The bucket must be completely empty (no objects) before it can be deleted.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
      },
      required: ['bucket'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = DeleteBucketSchema.parse(args);
        const client = clientFactory();
        await client.deleteBucket(validated.bucket);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Bucket deleted: ${validated.bucket}`,
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
          content: [{ type: 'text', text: `Error deleting bucket: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
