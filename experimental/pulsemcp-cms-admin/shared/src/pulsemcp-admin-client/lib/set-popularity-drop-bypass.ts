import type { PopularityDropBypassStatus } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

/**
 * Enable or disable the one-off SYSTEMIC_DROP bypass for popularity estimates.
 *
 * POST /api/popularity_drop_bypass with body { enabled } sets the flag and
 * returns the resulting status. When enabled, the NEXT run of
 * UpdatePopularityEstimatesFromBigqueryJob flushes legitimate drops held by the
 * SYSTEMIC_DROP guardrail, then consumes (auto-resets) the flag.
 */
export async function setPopularityDropBypass(
  apiKey: string,
  baseUrl: string,
  enabled: boolean
): Promise<PopularityDropBypassStatus> {
  const url = new URL('/api/popularity_drop_bypass', baseUrl);

  const response = await adminFetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error('Popularity drop bypass endpoint not found');
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => ({}))) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(
      `Failed to set popularity drop bypass: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as PopularityDropBypassStatus;
}
