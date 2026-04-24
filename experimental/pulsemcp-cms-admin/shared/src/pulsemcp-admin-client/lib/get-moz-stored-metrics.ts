import type { MozStoredMetricsResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function getMozStoredMetrics(
  apiKey: string,
  baseUrl: string,
  params: {
    server_id: string;
    canonical_id?: number;
    limit?: number;
    offset?: number;
  }
): Promise<MozStoredMetricsResponse> {
  const apiUrl = new URL('/api/moz/stored_metrics', baseUrl);

  apiUrl.searchParams.append('server_id', params.server_id);
  if (params.canonical_id !== undefined) {
    apiUrl.searchParams.append('canonical_id', params.canonical_id.toString());
  }
  if (params.limit !== undefined) {
    apiUrl.searchParams.append('limit', params.limit.toString());
  }
  if (params.offset !== undefined) {
    apiUrl.searchParams.append('offset', params.offset.toString());
  }

  const response = await adminFetch(apiUrl.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 400) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Bad request');
    }
    if (response.status === 404) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Server not found');
    }
    throw new Error(
      `Failed to fetch MOZ stored metrics: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MozStoredMetricsResponse;
  return data;
}
