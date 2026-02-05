import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket:
    'The name of the bucket to create. Must be globally unique, 3-63 characters, lowercase letters, numbers, and hyphens only.',
  region:
    'AWS region for the bucket (e.g., "us-west-2", "eu-west-1"). Defaults to the configured region.',
} as const;

export const CreateBucketSchema = z.object({
  bucket: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
    .describe(PARAM_DESCRIPTIONS.bucket),
  region: z.string().optional().describe(PARAM_DESCRIPTIONS.region),
});

export function createBucketTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 's3_create_bucket',
    description: `Create a new S3 bucket.

Creates an empty bucket with the specified name in the given region.

Example response:
{
  "success": true,
  "message": "Bucket created: my-new-bucket",
  "bucket": "my-new-bucket"
}

Bucket naming rules:
- Must be globally unique across all AWS accounts
- 3-63 characters long
- Only lowercase letters, numbers, and hyphens
- Must start and end with a letter or number
- Cannot be formatted as an IP address

Use cases:
- Set up storage for a new project
- Create buckets for different environments
- Provision storage infrastructure`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        region: { type: 'string', description: PARAM_DESCRIPTIONS.region },
      },
      required: ['bucket'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = CreateBucketSchema.parse(args);
        const client = clientFactory();
        await client.createBucket(validated.bucket, validated.region);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Bucket created: ${validated.bucket}`,
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
          content: [{ type: 'text', text: `Error creating bucket: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
