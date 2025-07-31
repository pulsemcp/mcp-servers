export async function checkDeploy(
  baseUrl: string,
  deployKey: string,
  activityId: string
): Promise<{ id: string; status: string; output?: string }> {
  const url = `${baseUrl}/apps/${deployKey}/activities/${activityId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid deploy key');
    }
    if (response.status === 404) {
      throw new Error('Activity not found - check the activity ID');
    }
    throw new Error(`Failed to check deployment status: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as unknown as Record<string, unknown>;

  // Return the deployment status
  // The API might return the status in different fields
  const status =
    (data.status as string) || (data.state as string) || (data.result as string) || 'unknown';

  return {
    id: activityId,
    status: status,
    output: (data.output as string) || (data.logs as string) || (data.log as string) || undefined,
  };
}
