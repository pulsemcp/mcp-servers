export async function triggerDeploy(
  baseUrl: string,
  deployKey: string,
  sha?: string
): Promise<{ id: string; status: string }> {
  // Build URL based on whether we have a specific SHA or want latest
  const url = sha
    ? `${baseUrl}/webhooks/deployments/${deployKey}?sha=${sha}`
    : `${baseUrl}/webhooks/deployments/${deployKey}?latest=true`;

  const response = await fetch(url, {
    method: 'POST',
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
      throw new Error('Deploy key not found - check your HATCHBOX_DEPLOY_KEY');
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => null)) as unknown as {
        message?: string;
      } | null;
      throw new Error(`Invalid deployment request: ${errorData?.message || 'validation failed'}`);
    }
    throw new Error(`Failed to trigger deployment: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as unknown as {
    id?: string;
    activity_id?: string;
    status?: string;
  };

  // The webhook returns an activity with id and initial status
  return {
    id: data.id || data.activity_id || 'unknown',
    status: data.status || 'pending',
  };
}
