import type { GoodJobActionResponse } from '../../types.js';

export async function retryGoodJob(
  apiKey: string,
  baseUrl: string,
  id: string
): Promise<GoodJobActionResponse> {
  const url = new URL(`/api/good_jobs/${id}/retry`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
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
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`GoodJob with ID ${id} not found`);
    }
    throw new Error(`Failed to retry good job: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoodJobActionResponse;
  return data;
}
