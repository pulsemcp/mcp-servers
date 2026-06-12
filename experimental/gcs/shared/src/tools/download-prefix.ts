import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the GCS bucket (e.g., "my-app-data")',
  prefix:
    'The key prefix to download recursively (e.g., "logs/2024/"). All objects under this prefix are downloaded. Use an empty string to download the entire bucket.',
  destinationDir:
    'Local directory to download into. Created if it does not exist. Defaults to a unique folder under the OS temp directory (e.g., "/tmp/gcs-download-<bucket>-<timestamp>").',
  maxInlineEntries:
    'Maximum number of file entries to include inline in the response manifest (default: 100). Counts and totals always reflect the full set regardless of this cap.',
} as const;

// Cap how many object paths are echoed back inline so that downloading thousands
// of objects does not produce an enormous tool response.
const DEFAULT_MAX_INLINE_ENTRIES = 100;

// Safety guard against a misbehaving paginator returning the same token forever.
const MAX_LIST_PAGES = 100_000;

export const DownloadPrefixSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  prefix: z.string().describe(PARAM_DESCRIPTIONS.prefix),
  destinationDir: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.destinationDir),
  maxInlineEntries: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(PARAM_DESCRIPTIONS.maxInlineEntries),
});

/**
 * Compute the path of an object key relative to the downloaded prefix, so the
 * directory structure under the prefix is preserved on disk.
 *
 * Example: prefix="logs/2024/", key="logs/2024/01/data.json" -> "01/data.json"
 */
export function relativeKeyForPrefix(key: string, prefix: string): string {
  let rel = key;
  if (prefix && key.startsWith(prefix)) {
    rel = key.slice(prefix.length);
  }
  // Strip any leading slashes left over when the prefix did not end in "/".
  rel = rel.replace(/^\/+/, '');
  // A key identical to a prefix that points directly at an object leaves an
  // empty relative path — fall back to the key's basename.
  return rel === '' ? path.posix.basename(key) : rel;
}

/** A GCS key is a "directory placeholder" when it ends with a slash. */
function isDirectoryPlaceholder(key: string): boolean {
  return key.endsWith('/');
}

export function downloadPrefixTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'download_prefix',
    description: `Recursively download every object under a prefix to a local directory, preserving the key path structure as subdirectories.

Unlike get_object (which returns a single object inline as UTF-8 text), this tool streams raw bytes to disk and is binary-safe. It is the right tool for bulk-fetching a sub-prefix so you can run local data-wrangling over the files.

Returns a manifest:
{
  "destinationDir": "/tmp/gcs-download-my-bucket-1700000000000",
  "objectCount": 1234,
  "totalBytes": 5678901,
  "files": [
    { "key": "logs/2024/01/data.json", "localPath": "/tmp/.../01/data.json", "size": 1234 }
  ],
  "filesTruncated": true,
  "errors": []
}

Notes:
- Directory placeholder objects (keys ending in "/") are skipped.
- Per-object download failures are collected in "errors" without aborting the whole batch.
- The "files" list is capped (see maxInlineEntries); "objectCount" and "totalBytes" always reflect the full download.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        prefix: { type: 'string', description: PARAM_DESCRIPTIONS.prefix },
        destinationDir: { type: 'string', description: PARAM_DESCRIPTIONS.destinationDir },
        maxInlineEntries: {
          type: 'number',
          minimum: 0,
          description: PARAM_DESCRIPTIONS.maxInlineEntries,
        },
      },
      required: ['bucket', 'prefix'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = DownloadPrefixSchema.parse(args);
        const client = clientFactory();
        const maxInlineEntries = validated.maxInlineEntries ?? DEFAULT_MAX_INLINE_ENTRIES;

        const destinationDir =
          validated.destinationDir ??
          path.join(os.tmpdir(), `gcs-download-${validated.bucket}-${Date.now()}`);
        const resolvedRoot = path.resolve(destinationDir);

        await mkdir(resolvedRoot, { recursive: true });

        // Collect every object key under the prefix, paginating until exhausted.
        // No delimiter is passed so the listing recurses into all sub-prefixes.
        const keys: Array<{ key: string; size?: number }> = [];
        let pageToken: string | undefined;
        const seenTokens = new Set<string>();
        let pages = 0;

        do {
          const page = await client.listObjects(validated.bucket, {
            prefix: validated.prefix,
            maxResults: 1000,
            pageToken,
          });

          for (const obj of page.objects) {
            if (!isDirectoryPlaceholder(obj.key)) {
              keys.push({ key: obj.key, size: obj.size });
            }
          }

          pageToken = page.isTruncated ? page.nextPageToken : undefined;
          if (pageToken && seenTokens.has(pageToken)) {
            // Paginator is looping on the same token; stop to avoid an infinite loop.
            break;
          }
          if (pageToken) seenTokens.add(pageToken);
        } while (pageToken && ++pages < MAX_LIST_PAGES);

        const files: Array<{ key: string; localPath: string; size: number }> = [];
        const errors: Array<{ key: string; error: string }> = [];
        let totalBytes = 0;

        for (const { key } of keys) {
          const rel = relativeKeyForPrefix(key, validated.prefix);
          const localPath = path.resolve(resolvedRoot, rel);

          // Defense in depth: never write outside the destination root, even if a
          // key contains ".." segments.
          if (localPath !== resolvedRoot && !localPath.startsWith(resolvedRoot + path.sep)) {
            errors.push({ key, error: 'Resolved path escapes destination directory; skipped' });
            continue;
          }

          try {
            const { content } = await client.getObjectBytes(validated.bucket, key);
            await mkdir(path.dirname(localPath), { recursive: true });
            await writeFile(localPath, content);
            totalBytes += content.length;
            files.push({ key, localPath, size: content.length });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ key, error: message });
          }
        }

        const manifest = {
          destinationDir: resolvedRoot,
          objectCount: files.length,
          totalBytes,
          files: files.slice(0, maxInlineEntries),
          filesTruncated: files.length > maxInlineEntries,
          errors,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(manifest, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error downloading prefix: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
