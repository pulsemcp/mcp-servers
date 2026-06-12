import { logInfo } from '../shared/logging.js';

/**
 * Minimal subset of the GCS client needed to validate credentials at startup.
 */
export interface HealthCheckClient {
  listBuckets(): Promise<unknown>;
  listObjects(bucket: string, options?: { maxResults?: number }): Promise<unknown>;
}

/**
 * Thrown when a constrained bucket cannot be reached (does not exist or the
 * service account lacks object-read access to it).
 */
export class BucketNotAccessibleError extends Error {
  constructor(bucket: string, cause?: unknown) {
    const causeMessage =
      cause instanceof Error ? cause.message : cause !== undefined ? String(cause) : undefined;
    super(
      `Constrained bucket "${bucket}" does not exist or is not accessible` +
        (causeMessage ? `: ${causeMessage}` : '')
    );
    this.name = 'BucketNotAccessibleError';
  }
}

/**
 * Validate GCS credentials and connectivity.
 *
 * - When constrained to a single bucket (`GCS_BUCKET`), probe ONLY that bucket
 *   with an object-scoped list (`storage.objects.list`). This is the exact
 *   permission the server actually exercises for the constrained bucket, and a
 *   least-privilege, bucket-scoped service account is granted it. This path must
 *   NOT call `listBuckets()` (project-level `storage.buckets.list`) NOR a
 *   bucket-metadata probe like `headBucket`/`getMetadata` (bucket-level
 *   `storage.buckets.get`): a correctly scoped read-only SA can be denied BOTH
 *   of those while still being able to read objects in the bucket.
 * - Without a constraint, validate by listing buckets, which legitimately
 *   requires project-level access.
 *
 * Throws on failure; callers decide how to surface it.
 */
export async function validateGcsCredentials(
  client: HealthCheckClient,
  constrainedBucket?: string
): Promise<void> {
  if (constrainedBucket) {
    try {
      // A single object-list request validates `storage.objects.list` on the
      // bucket without requiring any project- or bucket-level metadata
      // permission. maxResults:1 keeps the probe cheap.
      await client.listObjects(constrainedBucket, { maxResults: 1 });
    } catch (error) {
      throw new BucketNotAccessibleError(constrainedBucket, error);
    }
    logInfo('healthcheck', `Constrained bucket "${constrainedBucket}" verified`);
  } else {
    await client.listBuckets();
    logInfo('healthcheck', 'GCS credentials validated successfully');
  }
}
