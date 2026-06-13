import { z } from 'zod';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { GCSClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the GCS bucket (e.g., "my-app-data")',
  sourceDir:
    'Local directory to upload recursively. Every file under it is streamed directly from disk to GCS — the bytes never pass through this tool call, so it is binary-safe and avoids loading files into the model context.',
  destPrefix:
    'The destination key prefix in the bucket (e.g., "uploads/2024/"). The directory tree under sourceDir is preserved beneath this prefix. Use an empty string to upload to the bucket root.',
  maxInlineEntries:
    'Maximum number of file entries to include inline in the response manifest (default: 100). Counts and totals always reflect the full set regardless of this cap.',
} as const;

// Cap how many object paths are echoed back inline so that uploading thousands
// of files does not produce an enormous tool response.
const DEFAULT_MAX_INLINE_ENTRIES = 100;

export const UploadPrefixSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  sourceDir: z.string().min(1).describe(PARAM_DESCRIPTIONS.sourceDir),
  destPrefix: z.string().optional().describe(PARAM_DESCRIPTIONS.destPrefix),
  maxInlineEntries: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(PARAM_DESCRIPTIONS.maxInlineEntries),
});

/**
 * Build the GCS object key for a file at `relPath` (relative to the upload root),
 * placed beneath `destPrefix`. The OS path separator is normalized to "/" so
 * keys are well-formed regardless of platform.
 *
 * Example: destPrefix="uploads/", relPath="01/data.json" -> "uploads/01/data.json"
 */
export function keyForLocalFile(relPath: string, destPrefix: string): string {
  const normalizedRel = relPath.split(path.sep).join('/').replace(/^\/+/, '');
  if (!destPrefix) {
    return normalizedRel;
  }
  const cleanPrefix = destPrefix.replace(/\/+$/, '');
  return `${cleanPrefix}/${normalizedRel}`;
}

/**
 * Recursively collect absolute paths of every regular file under `dir`.
 *
 * Symbolic links that resolve to regular files are followed and uploaded, so a
 * tree of symlinked files is not silently dropped. Symbolic links that resolve
 * to directories are skipped — following them risks walking out of the tree or
 * into cycles. Broken/unresolvable symlinks are skipped here; if one happens to
 * be a real file path the per-file upload loop will surface the failure in the
 * manifest's `errors`.
 */
async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isSymbolicLink()) {
      // stat() follows the link to its target; lstat (via withFileTypes) does not.
      try {
        const target = await stat(fullPath);
        if (target.isFile()) {
          files.push(fullPath);
        }
      } catch {
        // Broken symlink — skip silently.
      }
    }
  }

  return files;
}

export function uploadPrefixTool(_server: Server, clientFactory: GCSClientFactory) {
  return {
    name: 'upload_prefix',
    description: `Recursively upload every file under a local directory to GCS, preserving the directory structure as key paths beneath a destination prefix.

Unlike put_object (which takes content inline as a string and routes every byte through the model context), this tool streams each file directly from disk to GCS server-side. It is the right tool for bulk-uploading many files or folders — including binary files like images — without blowing through context.

Returns a manifest:
{
  "bucket": "my-bucket",
  "sourceDir": "/tmp/exports",
  "destPrefix": "uploads/",
  "objectCount": 1234,
  "totalBytes": 5678901,
  "files": [
    { "localPath": "/tmp/exports/01/data.json", "key": "uploads/01/data.json", "size": 1234 }
  ],
  "filesTruncated": true,
  "errors": []
}

Notes:
- Content types are auto-detected from each file's extension.
- Symbolic links to files are followed and uploaded; symbolic links to directories are skipped (to avoid following links out of the tree or into cycles).
- Per-file upload failures are collected in "errors" without aborting the whole batch.
- The "files" list is capped (see maxInlineEntries); "objectCount" and "totalBytes" always reflect the full upload.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        sourceDir: { type: 'string', description: PARAM_DESCRIPTIONS.sourceDir },
        destPrefix: { type: 'string', description: PARAM_DESCRIPTIONS.destPrefix },
        maxInlineEntries: {
          type: 'number',
          minimum: 0,
          description: PARAM_DESCRIPTIONS.maxInlineEntries,
        },
      },
      required: ['bucket', 'sourceDir'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = UploadPrefixSchema.parse(args);
        const client = clientFactory();
        const maxInlineEntries = validated.maxInlineEntries ?? DEFAULT_MAX_INLINE_ENTRIES;
        const destPrefix = validated.destPrefix ?? '';

        const resolvedRoot = path.resolve(validated.sourceDir);
        const rootStats = await stat(resolvedRoot);
        if (!rootStats.isDirectory()) {
          throw new Error(
            `Source path "${validated.sourceDir}" is not a directory. Use put_object_from_path to upload a single file.`
          );
        }

        const localFiles = await collectFiles(resolvedRoot);

        const files: Array<{ localPath: string; key: string; size: number }> = [];
        const errors: Array<{ localPath: string; error: string }> = [];
        let totalBytes = 0;

        for (const localPath of localFiles) {
          const rel = path.relative(resolvedRoot, localPath);
          const key = keyForLocalFile(rel, destPrefix);

          try {
            const fileStats = await stat(localPath);
            await client.uploadFile(validated.bucket, localPath, key);
            totalBytes += fileStats.size;
            files.push({ localPath, key, size: fileStats.size });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ localPath, error: message });
          }
        }

        const manifest = {
          bucket: validated.bucket,
          sourceDir: resolvedRoot,
          destPrefix,
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
          content: [{ type: 'text', text: `Error uploading prefix: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
