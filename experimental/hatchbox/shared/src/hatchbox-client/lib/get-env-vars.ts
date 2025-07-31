export async function getEnvVars(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  appId: string
): Promise<Array<{ name: string; value: string }>> {
  const url = `${baseUrl}/api/v1/accounts/${accountId}/apps/${appId}/env_vars`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
    throw new Error(
      `Failed to get environment variables: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as unknown as {
    env_vars?: Array<{ name: string; value: string }>;
  };

  // The API returns an object with env_vars array
  if (!data.env_vars || !Array.isArray(data.env_vars)) {
    return [];
  }

  return data.env_vars.map((env) => ({
    name: env.name,
    value: env.value,
  }));
}
