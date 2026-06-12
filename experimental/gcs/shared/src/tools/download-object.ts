import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the GCS bucket (e.g., "my-app-data")',
  key: 'The object key (path) within the bucket (e.g., "exports/archive.tar.gz")',
  destinationPath:
    'Absolute or relative local file path to write the object to. Defaults to a unique file under the OS temp directory, preserving the key path (e.g., "/tmp/gcs-download-<bucket>-<timestamp>/<key>").',
} as const;

export const DownloadObjectSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  key: z.string().min(1).describe(PARAM_DESCRIPTIONS.key),
  destinationPath: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.destinationPath),
});

export function downloadObjectTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'download_object',
    description: `Download a single object to a local file path, writing raw bytes (binary-safe).

Unlike get_object (which returns content inline as UTF-8 text and is lossy for binary or large files), this tool streams the object to disk and returns the local path.

Example response:
{
  "bucket": "my-bucket",
  "key": "exports/archive.tar.gz",
  "localPath": "/tmp/gcs-download-my-bucket-1700000000000/exports/archive.tar.gz",
  "size": 1048576
}`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        key: { type: 'string', description: PARAM_DESCRIPTIONS.key },
        destinationPath: { type: 'string', description: PARAM_DESCRIPTIONS.destinationPath },
      },
      required: ['bucket', 'key'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = DownloadObjectSchema.parse(args);
        const client = clientFactory();

        let localPath: string;
        if (validated.destinationPath) {
          // The caller chose an explicit path; writing there is their intent.
          localPath = path.resolve(validated.destinationPath);
        } else {
          // The destination is derived from the (untrusted) object key, so confine
          // the resolved path to the temp root to prevent path-traversal escapes.
          const root = path.resolve(os.tmpdir(), `gcs-download-${validated.bucket}-${Date.now()}`);
          localPath = path.resolve(root, validated.key);
          if (localPath !== root && !localPath.startsWith(root + path.sep)) {
            throw new Error(
              `Object key "${validated.key}" resolves outside the destination directory`
            );
          }
        }

        const { content } = await client.getObjectBytes(validated.bucket, validated.key);
        await mkdir(path.dirname(localPath), { recursive: true });
        await writeFile(localPath, content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  bucket: validated.bucket,
                  key: validated.key,
                  localPath,
                  size: content.length,
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
          content: [{ type: 'text', text: `Error downloading object: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
