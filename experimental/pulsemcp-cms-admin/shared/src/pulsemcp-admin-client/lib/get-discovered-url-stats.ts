import type { DiscoveredUrlStats } from '../../types.js';

export async function getDiscoveredUrlStats(
  apiKey: string,
  baseUrl: string
): Promise<DiscoveredUrlStats> {
  const url = new URL('/admin/api/discovered_urls/stats', baseUrl);

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
    throw new Error(
      `Failed to fetch discovered URL stats: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as DiscoveredUrlStats;
  return data;
}
