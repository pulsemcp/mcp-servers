import { z } from 'zod';
import { stat } from 'fs/promises';
import path from 'path';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the GCS bucket (e.g., "my-app-data")',
  key: 'The destination object key (path) within the bucket (e.g., "exports/archive.tar.gz")',
  sourcePath:
    'Local file path to upload. The file is streamed directly from disk to GCS — its bytes never pass through this tool call, so it is binary-safe and avoids loading large files into the model context.',
  contentType:
    'MIME type of the object (e.g., "image/png"). If omitted, it is auto-detected from the file extension.',
  metadata: 'Custom metadata as key-value pairs (e.g., {"author": "system", "version": "1.0"})',
} as const;

export const PutObjectFromPathSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  key: z.string().min(1).describe(PARAM_DESCRIPTIONS.key),
  sourcePath: z.string().min(1).describe(PARAM_DESCRIPTIONS.sourcePath),
  contentType: z.string().optional().describe(PARAM_DESCRIPTIONS.contentType),
  metadata: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.metadata),
});

export function putObjectFromPathTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'put_object_from_path',
    description: `Upload a single local file to GCS by streaming it directly from disk (binary-safe).

Unlike put_object (which takes the object content inline as a string argument — routing every byte through the model context and requiring base64 for binary data), this tool reads from a local filesystem path and streams the bytes to GCS server-side. It is the right tool for uploading images, archives, or any large/binary file without blowing through context.

Example response:
{
  "bucket": "my-bucket",
  "key": "exports/archive.tar.gz",
  "sourcePath": "/tmp/archive.tar.gz",
  "size": 1048576,
  "etag": "\\"abc123def456\\"",
  "generation": "1234567890"
}

Notes:
- The content type is auto-detected from the file extension unless contentType is supplied.
- To upload an entire directory tree, use upload_prefix instead.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        key: { type: 'string', description: PARAM_DESCRIPTIONS.key },
        sourcePath: { type: 'string', description: PARAM_DESCRIPTIONS.sourcePath },
        contentType: { type: 'string', description: PARAM_DESCRIPTIONS.contentType },
        metadata: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: PARAM_DESCRIPTIONS.metadata,
        },
      },
      required: ['bucket', 'key', 'sourcePath'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = PutObjectFromPathSchema.parse(args);
        const client = clientFactory();

        const resolvedSource = path.resolve(validated.sourcePath);
        const stats = await stat(resolvedSource);
        if (!stats.isFile()) {
          throw new Error(
            `Source path "${validated.sourcePath}" is not a regular file. Use upload_prefix to upload a directory.`
          );
        }

        const result = await client.uploadFile(validated.bucket, resolvedSource, validated.key, {
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
                  message: `Uploaded ${resolvedSource} to gs://${validated.bucket}/${validated.key}`,
                  bucket: validated.bucket,
                  key: validated.key,
                  sourcePath: resolvedSource,
                  size: stats.size,
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
          content: [{ type: 'text', text: `Error uploading object from path: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
