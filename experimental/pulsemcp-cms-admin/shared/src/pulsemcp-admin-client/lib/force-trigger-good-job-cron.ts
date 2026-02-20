import type { GoodJobActionResponse } from '../../types.js';

export async function forceTriggerGoodJobCron(
  apiKey: string,
  baseUrl: string,
  cronKey: string
): Promise<GoodJobActionResponse> {
  const url = new URL(`/api/good_jobs/cron_schedules/${cronKey}/trigger`, baseUrl);

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
      throw new Error(`Cron schedule with key "${cronKey}" not found`);
    }
    throw new Error(`Failed to trigger cron schedule: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoodJobActionResponse;
  return data;
}
