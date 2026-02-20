import type { GoodJobProcess } from '../../types.js';

interface RailsGoodJobProcess {
  id: string;
  hostname: string;
  pid: number;
  queues?: string[];
  max_threads?: number;
  started_at?: string;
}

export async function getGoodJobProcesses(
  apiKey: string,
  baseUrl: string
): Promise<GoodJobProcess[]> {
  const url = new URL('/api/good_jobs/processes', baseUrl);

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
    throw new Error(
      `Failed to fetch good job processes: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsGoodJobProcess[];

  return data.map((proc) => ({
    id: proc.id,
    hostname: proc.hostname,
    pid: proc.pid,
    queues: proc.queues,
    max_threads: proc.max_threads,
    started_at: proc.started_at,
  }));
}
