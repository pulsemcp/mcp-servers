import type { PriorResultParams, PriorResultResponse } from '../../types.js';

/**
 * Get a prior exam result for comparison
 */
export async function getPriorResult(
  apiKey: string,
  baseUrl: string,
  params: PriorResultParams
): Promise<PriorResultResponse> {
  const url = new URL('/api/proctor/prior_result', baseUrl);

  url.searchParams.append('mirror_id', String(params.mirror_id));
  url.searchParams.append('exam_id', params.exam_id);

  if (params.input_json) {
    url.searchParams.append('input_json', params.input_json);
  }

  const response = await fetch(url.toString(), {
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
      throw new Error('User lacks admin privileges or insufficient permissions');
    }
    if (response.status === 400) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Bad request: ${errorData.error || 'Missing required parameters'}`);
    }
    if (response.status === 404) {
      throw new Error('No prior result found');
    }
    throw new Error(`Failed to get prior result: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as PriorResultResponse;
}
