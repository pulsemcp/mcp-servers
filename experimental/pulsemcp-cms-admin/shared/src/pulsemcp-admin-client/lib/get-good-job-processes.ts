import type { GoodJobProcess } from '../../types.js';

interface RailsScheduler {
  queues: string;
  max_threads: number;
}

interface RailsGoodJobProcess {
  id: string;
  state: {
    hostname: string;
    pid: number;
    schedulers?: RailsScheduler[];
  };
  created_at?: string;
  updated_at?: string;
}

interface RailsProcessesResponse {
  data: RailsGoodJobProcess[];
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

  const json = (await response.json()) as RailsProcessesResponse;
  const processes = json.data;

  return processes.map((proc) => {
    const schedulers = proc.state.schedulers ?? [];
    const queues = schedulers.map((s) => s.queues);
    const maxThreads = schedulers.reduce((sum, s) => sum + s.max_threads, 0);

    return {
      id: proc.id,
      hostname: proc.state.hostname,
      pid: proc.state.pid,
      queues,
      max_threads: maxThreads || undefined,
      started_at: proc.created_at,
    };
  });
}
