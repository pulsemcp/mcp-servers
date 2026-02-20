import type { GoodJob, GoodJobStatus } from '../../types.js';

interface RailsGoodJob {
  id: string;
  job_class: string;
  queue_name: string;
  status: GoodJobStatus;
  error?: string;
  serialized_params?: Record<string, unknown>;
  scheduled_at?: string;
  performed_at?: string;
  finished_at?: string;
  created_at?: string;
  updated_at?: string;
}

export async function retryGoodJob(apiKey: string, baseUrl: string, id: string): Promise<GoodJob> {
  const url = new URL(`/api/good_jobs/${encodeURIComponent(id)}/retry`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
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
      throw new Error(`Good job with ID ${id} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Retry failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to retry good job: ${response.status} ${response.statusText}`);
  }

  const job = (await response.json()) as RailsGoodJob;

  return {
    id: job.id,
    job_class: job.job_class,
    queue_name: job.queue_name,
    status: job.status,
    error: job.error,
    serialized_params: job.serialized_params,
    scheduled_at: job.scheduled_at,
    performed_at: job.performed_at,
    finished_at: job.finished_at,
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}
