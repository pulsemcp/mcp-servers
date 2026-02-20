import type { GoodJobStatistics } from '../../types.js';

interface RailsStatisticsResponse {
  total: number;
  by_status: {
    scheduled: number;
    queued: number;
    running: number;
    succeeded: number;
    discarded: number;
    retried?: number;
  };
  by_queue?: Record<string, number>;
}

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

  const data = (await response.json()) as RailsStatisticsResponse;

  return {
    total: data.total,
    scheduled: data.by_status.scheduled,
    queued: data.by_status.queued,
    running: data.by_status.running,
    succeeded: data.by_status.succeeded,
    failed: data.by_status.retried ?? 0,
    discarded: data.by_status.discarded,
  };
}
