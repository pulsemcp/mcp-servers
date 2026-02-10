import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  sourceBucket: 'The source bucket name (e.g., "source-bucket")',
  sourceKey: 'The source object key (e.g., "path/to/source-file.txt")',
  destBucket: 'The destination bucket name (e.g., "dest-bucket")',
  destKey: 'The destination object key (e.g., "path/to/dest-file.txt")',
} as const;

export const CopyObjectSchema = z.object({
  sourceBucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.sourceBucket),
  sourceKey: z.string().min(1).describe(PARAM_DESCRIPTIONS.sourceKey),
  destBucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.destBucket),
  destKey: z.string().min(1).describe(PARAM_DESCRIPTIONS.destKey),
});

export function copyObjectTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'copy_object',
    description: `Copy an object within GCS (same bucket or across buckets).

Copies an object from one location to another. Can be used to rename objects or move them between buckets.

Example response:
{
  "success": true,
  "message": "Object copied from gs://source-bucket/file.txt to gs://dest-bucket/file.txt",
  "etag": "\\"abc123\\"",
  "generation": "1234567890"
}

Use cases:
- Create backups of files
- Move files between buckets
- Rename objects (copy then delete original)
- Organize files into different paths`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        sourceBucket: { type: 'string', description: PARAM_DESCRIPTIONS.sourceBucket },
        sourceKey: { type: 'string', description: PARAM_DESCRIPTIONS.sourceKey },
        destBucket: { type: 'string', description: PARAM_DESCRIPTIONS.destBucket },
        destKey: { type: 'string', description: PARAM_DESCRIPTIONS.destKey },
      },
      required: ['sourceBucket', 'sourceKey', 'destBucket', 'destKey'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = CopyObjectSchema.parse(args);
        const client = clientFactory();
        const result = await client.copyObject(
          validated.sourceBucket,
          validated.sourceKey,
          validated.destBucket,
          validated.destKey
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Object copied from gs://${validated.sourceBucket}/${validated.sourceKey} to gs://${validated.destBucket}/${validated.destKey}`,
                  ...result,
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
          content: [{ type: 'text', text: `Error copying object: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
