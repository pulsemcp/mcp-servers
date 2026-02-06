import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the bucket to check (e.g., "my-bucket")',
} as const;

export const HeadBucketSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
});

export function headBucketTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 'head_bucket',
    description: `Check if an S3 bucket exists and is accessible.

Returns whether the bucket exists and the caller has permission to access it.

Example response:
{
  "exists": true,
  "bucket": "my-bucket"
}

Use cases:
- Verify bucket exists before operations
- Check bucket accessibility
- Validate bucket names`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
      },
      required: ['bucket'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = HeadBucketSchema.parse(args);
        const client = clientFactory();
        const exists = await client.headBucket(validated.bucket);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  exists,
                  bucket: validated.bucket,
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
          content: [{ type: 'text', text: `Error checking bucket: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
