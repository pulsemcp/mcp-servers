/**
 * Low-level HTTP helper for FlightAware AeroAPI v4.
 *
 * AeroAPI authenticates with an `x-apikey` request header (not a query param)
 * and returns JSON. Base URL: https://aeroapi.flightaware.com/aeroapi
 */

export const AEROAPI_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';

export const REQUEST_TIMEOUT_MS = 30000;

/** Cap on how much of an upstream error body is echoed into a thrown Error. */
const MAX_ERROR_BODY_CHARS = 500;

/**
 * Build an Error for a non-2xx AeroAPI response. The upstream body is untrusted
 * and unbounded, so it is truncated before being surfaced to the caller.
 */
export function aeroApiError(status: number, statusText: string, body: string): Error {
  const truncated =
    body.length > MAX_ERROR_BODY_CHARS
      ? `${body.slice(0, MAX_ERROR_BODY_CHARS)}… (truncated)`
      : body;
  return new Error(`AeroAPI request failed (${status} ${statusText}): ${truncated}`);
}

export interface AeroApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Perform an authenticated AeroAPI GET request and return the parsed JSON body.
 *
 * Every tool this server exposes is a read, so only GET is supported. Returns
 * `undefined` when the response has an empty body. Throws an Error with status
 * + body text on a non-2xx response.
 */
export async function aeroApiRequest<T>(
  apiKey: string,
  path: string,
  options: AeroApiRequestOptions = {}
): Promise<T> {
  const { query } = options;

  const url = new URL(`${AEROAPI_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-apikey': apiKey,
      Accept: 'application/json; charset=UTF-8',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw aeroApiError(response.status, response.statusText, errorText);
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
