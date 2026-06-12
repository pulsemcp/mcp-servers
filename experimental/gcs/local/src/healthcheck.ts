import { logInfo } from '../shared/logging.js';

/**
 * Minimal subset of the GCS client needed to validate credentials at startup.
 */
export interface HealthCheckClient {
  listBuckets(): Promise<unknown>;
  headBucket(bucket: string): Promise<boolean>;
}

/**
 * Thrown when a constrained bucket cannot be reached (does not exist or the
 * service account lacks access to it).
 */
export class BucketNotAccessibleError extends Error {
  constructor(bucket: string) {
    super(`Constrained bucket "${bucket}" does not exist or is not accessible`);
    this.name = 'BucketNotAccessibleError';
  }
}

/**
 * Validate GCS credentials and connectivity.
 *
 * - When constrained to a single bucket (`GCS_BUCKET`), probe ONLY that bucket
 *   via `headBucket`, which needs only bucket-level permissions
 *   (`storage.buckets.get`). This path must NOT call `listBuckets()`, because
 *   that requires the project-level `storage.buckets.list` permission, which a
 *   least-privilege, bucket-scoped service account intentionally does not have.
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
    const bucketExists = await client.headBucket(constrainedBucket);
    if (!bucketExists) {
      throw new BucketNotAccessibleError(constrainedBucket);
    }
    logInfo('healthcheck', `Constrained bucket "${constrainedBucket}" verified`);
  } else {
    await client.listBuckets();
    logInfo('healthcheck', 'GCS credentials validated successfully');
  }
}
