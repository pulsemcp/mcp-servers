import type { SaveResultParams, SaveResultResponse } from '../../types.js';

/**
 * Save exam results to the database
 */
export async function saveResult(
  apiKey: string,
  baseUrl: string,
  params: SaveResultParams
): Promise<SaveResultResponse> {
  const url = new URL('/api/proctor/save_result', baseUrl);

  const body: Record<string, unknown> = {
    runtime_id: params.runtime_id,
    exam_id: params.exam_id,
    results: typeof params.results === 'string' ? params.results : JSON.stringify(params.results),
  };

  if (params.custom_runtime_image) {
    body.custom_runtime_image = params.custom_runtime_image;
  }

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
      throw new Error('User lacks admin privileges or insufficient permissions');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Validation error: ${errorData.error || 'Unknown validation error'}`);
    }
    throw new Error(`Failed to save result: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SaveResultResponse;
}
