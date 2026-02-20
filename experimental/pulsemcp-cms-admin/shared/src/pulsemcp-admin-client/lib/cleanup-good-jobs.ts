import type { GoodJobStatus } from '../../types.js';

export async function cleanupGoodJobs(
  apiKey: string,
  baseUrl: string,
  params?: {
    older_than_days?: number;
    status?: GoodJobStatus;
  }
): Promise<{ success: boolean; message: string }> {
  const url = new URL('/api/good_jobs/cleanup', baseUrl);

  const body: Record<string, unknown> = {};

  if (params?.older_than_days !== undefined) {
    body.older_than_days = params.older_than_days;
  }
  if (params?.status) {
    body.status = params.status;
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Cleanup failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to cleanup good jobs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success?: boolean; message?: string };

  return {
    success: data.success !== false,
    message: data.message || 'Successfully cleaned up good jobs',
  };
}
