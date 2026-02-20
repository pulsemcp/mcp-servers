import type { GoodJobCronSchedule } from '../../types.js';

interface RailsCronSchedule {
  cron_key: string;
  job_class: string;
  cron_expression: string;
  description?: string;
  next_scheduled_at?: string;
  last_run_at?: string;
}

export async function getGoodJobCronSchedules(
  apiKey: string,
  baseUrl: string
): Promise<GoodJobCronSchedule[]> {
  const url = new URL('/api/good_jobs/cron_schedules', baseUrl);

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
    throw new Error(`Failed to fetch cron schedules: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsCronSchedule[];

  return data.map((schedule) => ({
    cron_key: schedule.cron_key,
    job_class: schedule.job_class,
    cron_expression: schedule.cron_expression,
    description: schedule.description,
    next_scheduled_at: schedule.next_scheduled_at,
    last_run_at: schedule.last_run_at,
  }));
}
