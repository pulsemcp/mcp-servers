import type { GoodJob, GoodJobStatus } from '../../types.js';

interface RailsGoodJob {
  id: string;
  job_class: string;
  queue_name: string;
  status: GoodJobStatus;
  scheduled_at?: string;
  performed_at?: string;
  finished_at?: string;
  error?: string;
  serialized_params?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function getGoodJob(apiKey: string, baseUrl: string, id: string): Promise<GoodJob> {
  const url = new URL(`/api/good_jobs/${id}`, baseUrl);

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
    if (response.status === 404) {
      throw new Error(`GoodJob with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch good job: ${response.status} ${response.statusText}`);
  }

  const job = (await response.json()) as RailsGoodJob;

  return {
    id: job.id,
    job_class: job.job_class,
    queue_name: job.queue_name,
    status: job.status,
    scheduled_at: job.scheduled_at,
    performed_at: job.performed_at,
    finished_at: job.finished_at,
    error: job.error,
    serialized_params: job.serialized_params,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}
