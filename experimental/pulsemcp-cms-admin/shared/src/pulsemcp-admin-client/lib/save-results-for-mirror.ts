import type { ProctorSaveResultsParams, ProctorSaveResultsResponse } from '../../types.js';

export async function saveResultsForMirror(
  apiKey: string,
  baseUrl: string,
  params: ProctorSaveResultsParams
): Promise<ProctorSaveResultsResponse> {
  const url = new URL('/api/proctor/save_results_for_mirror', baseUrl);

  const body = {
    mirror_id: params.mirror_id,
    runtime_id: params.runtime_id,
    results: params.results,
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 404) {
      throw new Error(`Mirror not found with ID: ${params.mirror_id}`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Validation failed: ${errorData.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to save proctor results: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ProctorSaveResultsResponse;
}
