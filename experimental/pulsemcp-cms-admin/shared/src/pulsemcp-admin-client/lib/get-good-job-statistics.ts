import type { GoodJobStatistics } from '../../types.js';

export async function getGoodJobStatistics(
  apiKey: string,
  baseUrl: string
): Promise<GoodJobStatistics> {
  const url = new URL('/api/good_jobs/statistics', baseUrl);

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
      throw new Error('User lacks admin privileges');
    }
    throw new Error(`Failed to fetch job statistics: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoodJobStatistics;

  return {
    total: data.total,
    scheduled: data.scheduled,
    queued: data.queued,
    running: data.running,
    succeeded: data.succeeded,
    failed: data.failed,
    discarded: data.discarded,
  };
}
