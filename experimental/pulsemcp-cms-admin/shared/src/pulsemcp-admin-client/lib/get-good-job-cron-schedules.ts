import type { GoodJobCronSchedule, GoodJobCronSchedulesResponse } from '../../types.js';

interface RailsCronSchedule {
  cron_key: string;
  job_class: string;
  cron_schedule: string;
  description?: string;
  next_scheduled_at?: string;
  last_run_at?: string;
}

interface RailsResponse {
  data: RailsCronSchedule[];
}

function mapCronSchedule(schedule: RailsCronSchedule): GoodJobCronSchedule {
  return {
    cron_key: schedule.cron_key,
    job_class: schedule.job_class,
    cron_schedule: schedule.cron_schedule,
    description: schedule.description,
    next_scheduled_at: schedule.next_scheduled_at,
    last_run_at: schedule.last_run_at,
  };
}

export async function getGoodJobCronSchedules(
  apiKey: string,
  baseUrl: string
): Promise<GoodJobCronSchedulesResponse> {
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

  const data = (await response.json()) as RailsResponse;

  return {
    cron_schedules: data.data.map(mapCronSchedule),
  };
}
