export async function deleteEnvVars(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  appId: string,
  names: string[]
): Promise<Array<{ name: string; value: string }>> {
  const url = `${baseUrl}/api/v1/accounts/${accountId}/apps/${appId}/env_vars`;

  // The API expects an array of env var names to delete
  const payload = {
    env_vars: names,
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('Access denied - check account and app IDs');
    }
    if (response.status === 404) {
      throw new Error('Account or app not found');
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => null)) as unknown as {
        message?: string;
      } | null;
      throw new Error(`Invalid environment variable: ${errorData?.message || 'validation failed'}`);
    }
    throw new Error(
      `Failed to delete environment variables: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();
  if (!text) {
    // API might return empty response on success
    return [];
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // If we can't parse the response but the status was OK, assume success
    return [];
  }

  // The API returns the updated list of all env vars
  const parsed = data as { env_vars?: Array<{ name: string; value: string }> };
  if (!parsed.env_vars || !Array.isArray(parsed.env_vars)) {
    return [];
  }

  return parsed.env_vars.map((env) => ({
    name: env.name,
    value: env.value,
  }));
}
