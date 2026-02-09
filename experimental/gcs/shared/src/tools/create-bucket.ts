import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket:
    'The name of the bucket to create. Must be globally unique, 3-63 characters, lowercase letters, numbers, and hyphens only.',
  location:
    'GCS location for the bucket (e.g., "US", "EU", "us-central1", "europe-west1"). Defaults to "US".',
} as const;

export const CreateBucketSchema = z.object({
  bucket: z
    .string()
    .min(3)
    .max(63)
    // GCS bucket naming rules:
    // - Start and end with lowercase letter or number
    // - Can contain lowercase letters, numbers, hyphens, and dots
    // - No consecutive dots or periods next to hyphens
    .regex(/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/)
    .refine((val) => !/^\d+\.\d+\.\d+\.\d+$/.test(val), {
      message: 'Bucket name cannot be formatted as an IP address',
    })
    .describe(PARAM_DESCRIPTIONS.bucket),
  location: z.string().optional().describe(PARAM_DESCRIPTIONS.location),
});

export function createBucketTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'create_bucket',
    description: `Create a new GCS bucket.

Creates an empty bucket with the specified name in the given location.

Example response:
{
  "success": true,
  "message": "Bucket created: my-new-bucket",
  "bucket": "my-new-bucket"
}

Bucket naming rules:
- Must be globally unique across all Google Cloud projects
- 3-63 characters long
- Only lowercase letters, numbers, hyphens, and dots
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
        location: { type: 'string', description: PARAM_DESCRIPTIONS.location },
      },
      required: ['bucket'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = CreateBucketSchema.parse(args);
        const client = clientFactory();
        await client.createBucket(validated.bucket, validated.location);

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
