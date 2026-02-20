import type { GoodJobProcess, GoodJobProcessesResponse } from '../../types.js';

interface RailsProcess {
  id: string;
  state: string;
  hostname?: string;
  pid?: number;
  queues?: string[];
  max_threads?: number;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsProcess[];
}

function mapProcess(process: RailsProcess): GoodJobProcess {
  return {
    id: process.id,
    state: process.state,
    hostname: process.hostname,
    pid: process.pid,
    queues: process.queues,
    max_threads: process.max_threads,
    created_at: process.created_at,
    updated_at: process.updated_at,
  };
}

export async function getGoodJobProcesses(
  apiKey: string,
  baseUrl: string
): Promise<GoodJobProcessesResponse> {
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

  const data = (await response.json()) as RailsResponse;

  return {
    processes: data.data.map(mapProcess),
  };
}
