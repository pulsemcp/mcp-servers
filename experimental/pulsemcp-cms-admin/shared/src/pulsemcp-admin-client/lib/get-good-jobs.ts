import type { GoodJob, GoodJobsResponse, GoodJobStatus } from '../../types.js';

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

interface RailsResponse {
  data: RailsGoodJob[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapGoodJob(job: RailsGoodJob): GoodJob {
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

export async function getGoodJobs(
  apiKey: string,
  baseUrl: string,
  params?: {
    queue_name?: string;
    status?: GoodJobStatus;
    job_class?: string;
    after?: string;
    before?: string;
    limit?: number;
    offset?: number;
  }
): Promise<GoodJobsResponse> {
  const url = new URL('/api/good_jobs', baseUrl);

  if (params?.queue_name) {
    url.searchParams.append('queue_name', params.queue_name);
  }
  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.job_class) {
    url.searchParams.append('job_class', params.job_class);
  }
  if (params?.after) {
    url.searchParams.append('after', params.after);
  }
  if (params?.before) {
    url.searchParams.append('before', params.before);
  }
  if (params?.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    url.searchParams.append('offset', params.offset.toString());
  }

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
    throw new Error(`Failed to fetch good jobs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    jobs: data.data.map(mapGoodJob),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
