/**
 * Retry helpers for transient connection-level failures.
 *
 * The Google Cloud Storage SDK performs an OAuth token exchange against
 * `https://www.googleapis.com/oauth2/v4/token` on the first operation. That
 * exchange runs through `google-auth-library` -> `gtoken` -> `gaxios` ->
 * `node-fetch`. When the underlying socket is reset mid-response, node-fetch
 * surfaces a "Premature close" error. gaxios retries the token POST, but only
 * a couple of times with sub-second backoff, so a connection blip lasting more
 * than a second or two exhausts those internal retries and the error takes down
 * the entire operation.
 *
 * These helpers add an application-level retry with a longer, exponential
 * backoff window so a transient reset self-heals instead of failing the call.
 */

/**
 * Substrings (case-insensitive) that identify a transient connection-level
 * failure worth retrying. Covers the "Premature close" signature seen on the
 * token exchange plus the standard retryable network error codes the GCS SDK
 * itself treats as connection problems.
 *
 * Deliberately EXCLUDED: `ENOTFOUND`, `ECONNREFUSED`, `EHOSTUNREACH`,
 * `ENETUNREACH`. These are almost always persistent — a wrong endpoint/bucket
 * region (NXDOMAIN), nothing listening, or a sandbox with no egress. Retrying
 * them just burns the full backoff budget before surfacing what is really a
 * configuration/connectivity error, masking the true cause. The GCS SDK's own
 * default retry predicate excludes them for the same reason; a config error
 * should fail fast.
 */
const TRANSIENT_ERROR_PATTERNS = [
  'premature close',
  'unexpected connection closure',
  'socket hang up',
  'econnreset',
  'etimedout',
  'eai_again',
  'epipe',
  'socket connection timeout',
];

/**
 * Collect message/code strings from an error and any nested `cause` so we can
 * match against {@link TRANSIENT_ERROR_PATTERNS}. node-fetch and gaxios wrap the
 * original socket error, so the meaningful text often lives on `error.cause`.
 */
function collectErrorText(err: unknown, depth = 0): string {
  if (!err || depth > 5) {
    return '';
  }

  const parts: string[] = [];
  const e = err as { message?: unknown; code?: unknown; cause?: unknown; errors?: unknown };

  if (typeof e.message === 'string') {
    parts.push(e.message);
  }
  if (typeof e.code === 'string') {
    parts.push(e.code);
  } else if (typeof e.code === 'number') {
    parts.push(String(e.code));
  }

  // Aggregate-style errors (e.g. GCS ApiError) expose nested reasons.
  if (Array.isArray(e.errors)) {
    for (const nested of e.errors) {
      parts.push(collectErrorText(nested, depth + 1));
    }
  }

  if (e.cause && e.cause !== err) {
    parts.push(collectErrorText(e.cause, depth + 1));
  }

  return parts.join(' ');
}

/**
 * Returns true when an error looks like a transient connection-level failure
 * (premature close, connection reset, DNS blip, etc.) rather than a permanent
 * error such as authentication failure or a missing object.
 */
export function isTransientConnectionError(err: unknown): boolean {
  const haystack = collectErrorText(err).toLowerCase();
  if (!haystack) {
    return false;
  }
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => haystack.includes(pattern));
}

export interface RetryOptions {
  /** Total number of attempts, including the first. Default 4. */
  maxAttempts?: number;
  /** Delay before the first retry, in milliseconds. Default 250. */
  initialDelayMs?: number;
  /** Upper bound on any single backoff delay, in milliseconds. Default 4000. */
  maxDelayMs?: number;
  /** Exponential backoff multiplier. Default 2. */
  multiplier?: number;
  /** Invoked before each backoff sleep. Useful for logging/observability. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  /** Sleep implementation, injectable for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying with exponential backoff when it fails with a transient
 * connection-level error. Non-transient errors (and exhausted retries) are
 * rethrown immediately so genuine failures are not masked.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const initialDelayMs = options.initialDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const multiplier = options.multiplier ?? 2;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts || !isTransientConnectionError(err)) {
        throw err;
      }
      const delayMs = Math.min(initialDelayMs * multiplier ** (attempt - 1), maxDelayMs);
      options.onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
