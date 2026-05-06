export class GoogleApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly category:
      | 'auth'
      | 'forbidden'
      | 'not_found'
      | 'rate_limit'
      | 'server'
      | 'client'
      | 'unknown',
    message: string
  ) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

function categorize(status: number): GoogleApiError['category'] {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

function categoryPrefix(category: GoogleApiError['category']): string {
  switch (category) {
    case 'auth':
      return 'Authentication failed';
    case 'forbidden':
      return 'Permission denied';
    case 'not_found':
      return 'Not found';
    case 'rate_limit':
      return 'Rate limit exceeded';
    case 'server':
      return 'Google API server error';
    case 'client':
      return 'Bad request';
    default:
      return 'Request failed';
  }
}

/**
 * Throws a meaningful error for a non-OK Google API response.
 * Reads the body once, attempts to parse it as JSON for a Google API error message,
 * and falls back to the raw text otherwise.
 */
export async function throwForGoogleApiError(
  response: Response,
  operation: string
): Promise<never> {
  const bodyText = await response.text().catch(() => '');
  let detail = bodyText;
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; status?: string };
    };
    if (parsed?.error?.message) {
      detail = parsed.error.status
        ? `${parsed.error.status}: ${parsed.error.message}`
        : parsed.error.message;
    }
  } catch {
    // bodyText is not JSON - keep as raw text
  }
  const category = categorize(response.status);
  const message = `${categoryPrefix(category)} (${operation}): ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`;
  throw new GoogleApiError(response.status, category, message);
}
