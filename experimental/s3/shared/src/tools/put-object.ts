import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the S3 bucket (e.g., "my-app-data")',
  key: 'The object key (path) within the bucket (e.g., "data/config.json")',
  content: 'The content to store in the object (text/string data)',
  contentType:
    'MIME type of the content (e.g., "application/json", "text/plain"). Defaults to "text/plain".',
  metadata: 'Custom metadata as key-value pairs (e.g., {"author": "system", "version": "1.0"})',
} as const;

export const PutObjectSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  key: z.string().min(1).describe(PARAM_DESCRIPTIONS.key),
  content: z.string().describe(PARAM_DESCRIPTIONS.content),
  contentType: z.string().optional().describe(PARAM_DESCRIPTIONS.contentType),
  metadata: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.metadata),
});

export function putObjectTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 'put_object',
    description: `Upload or update an object in S3.

Creates a new object or overwrites an existing one with the provided content.

Example response:
{
  "etag": "\\"abc123def456\\"",
  "versionId": "v1.0"
}

Use cases:
- Store configuration files
- Upload JSON data
- Create text files
- Save generated content

Note: This tool handles text content. For binary files, use base64 encoding or a different approach.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        key: { type: 'string', description: PARAM_DESCRIPTIONS.key },
        content: { type: 'string', description: PARAM_DESCRIPTIONS.content },
        contentType: { type: 'string', description: PARAM_DESCRIPTIONS.contentType },
        metadata: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: PARAM_DESCRIPTIONS.metadata,
        },
      },
      required: ['bucket', 'key', 'content'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = PutObjectSchema.parse(args);
        const client = clientFactory();
        const result = await client.putObject(validated.bucket, validated.key, validated.content, {
          contentType: validated.contentType,
          metadata: validated.metadata,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Object uploaded to s3://${validated.bucket}/${validated.key}`,
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
          content: [{ type: 'text', text: `Error putting object: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
