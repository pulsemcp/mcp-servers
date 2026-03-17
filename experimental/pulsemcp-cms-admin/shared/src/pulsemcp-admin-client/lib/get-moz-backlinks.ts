import type { MozBacklinksResponse } from '../../types.js';

export async function getMozBacklinks(
  apiKey: string,
  baseUrl: string,
  params: {
    url: string;
    scope?: 'url' | 'domain' | 'subdomain';
    limit?: number;
  }
): Promise<MozBacklinksResponse> {
  const apiUrl = new URL('/api/moz/backlinks', baseUrl);

  apiUrl.searchParams.append('url', params.url);
  if (params.scope) {
    apiUrl.searchParams.append('scope', params.scope);
  }
  if (params.limit !== undefined) {
    apiUrl.searchParams.append('limit', params.limit.toString());
  }

  const response = await fetch(apiUrl.toString(), {
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
    if (response.status === 400) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Bad request');
    }
    if (response.status === 429) {
      throw new Error('MOZ API rate limit exceeded. Please try again later.');
    }
    if (response.status === 502) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'MOZ API error');
    }
    throw new Error(`Failed to fetch MOZ backlinks: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: MozBacklinksResponse };
  return data.data;
}
