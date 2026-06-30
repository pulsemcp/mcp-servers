import type { Secret } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

/**
 * Fetch a secret by id or slug. Returns null when the secret does not exist
 * (HTTP 404) so callers can branch on create-vs-reuse without catching errors.
 */
export async function getSecret(
  apiKey: string,
  baseUrl: string,
  idOrSlug: string | number
): Promise<Secret | null> {
  const url = new URL(`/api/secrets/${encodeURIComponent(String(idOrSlug))}`, baseUrl);

  const response = await adminFetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    throw new Error(`Failed to fetch secret: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Secret;
}
