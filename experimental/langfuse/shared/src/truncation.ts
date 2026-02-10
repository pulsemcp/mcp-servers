/**
 * Truncation utility for large Langfuse payloads.
 *
 * Any string field exceeding MAX_INLINE_LENGTH characters is truncated inline
 * and the full value is written to a /tmp file. The truncated text includes
 * a reference to the file so the calling agent can grep it if needed.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const MAX_INLINE_LENGTH = 1000;

let fileCounter = 0;

function generateTmpPath(fieldHint: string): string {
  fileCounter++;
  const rand = randomBytes(4).toString('hex');
  const safeName = fieldHint.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 60);
  return join('/tmp', `langfuse_${safeName}_${rand}_${fileCounter}.txt`);
}

/**
 * Recursively walks an object and truncates any string values longer than
 * MAX_INLINE_LENGTH. The full content is saved to a /tmp file, and the
 * truncated value includes a pointer to that file.
 */
export function truncateLargeFields(obj: unknown, currentPath: string = ''): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    if (obj.length > MAX_INLINE_LENGTH) {
      const tmpPath = generateTmpPath(currentPath || 'field');
      writeFileSync(tmpPath, obj, 'utf-8');
      const preview = obj.slice(0, MAX_INLINE_LENGTH);
      return `${preview}... [TRUNCATED - full content (${obj.length} chars) saved to ${tmpPath} - use grep to search it]`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const arrayPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      return truncateLargeFields(item, arrayPath);
    });
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      result[key] = truncateLargeFields(value, newPath);
    }
    return result;
  }

  return obj;
}

/**
 * Reset the file counter (useful for testing).
 */
export function resetFileCounter(): void {
  fileCounter = 0;
}
