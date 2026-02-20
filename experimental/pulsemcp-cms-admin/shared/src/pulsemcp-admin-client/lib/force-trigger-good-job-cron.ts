export async function forceTriggerGoodJobCron(
  apiKey: string,
  baseUrl: string,
  cronKey: string
): Promise<{ success: boolean; message: string }> {
  const url = new URL(
    `/api/good_jobs/cron_schedules/${encodeURIComponent(cronKey)}/trigger`,
    baseUrl
  );

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
      throw new Error(`Cron schedule with key "${cronKey}" not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Trigger failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to trigger cron schedule: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success?: boolean; message?: string };

  return {
    success: data.success !== false,
    message: data.message || `Successfully triggered cron schedule "${cronKey}"`,
  };
}
