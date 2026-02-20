import type { GoodJobActionResponse } from '../../types.js';

export async function rescheduleGoodJob(
  apiKey: string,
  baseUrl: string,
  id: string,
  scheduledAt: string
): Promise<GoodJobActionResponse> {
  const url = new URL(`/api/good_jobs/${id}/reschedule`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to reschedule good job: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoodJobActionResponse;
  return data;
}
