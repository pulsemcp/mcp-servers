import type { Provider } from '../../types.js';

export async function getProviderById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<Provider | null> {
  const url = new URL(`/api/providers/${id}`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    throw new Error(`Failed to fetch provider: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Provider;
  return data;
}
