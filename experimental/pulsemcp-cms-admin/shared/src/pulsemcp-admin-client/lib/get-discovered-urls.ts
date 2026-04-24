import type { DiscoveredUrl, DiscoveredUrlsResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

interface RailsDiscoveredUrl {
  id: number;
  url: string;
  source: string;
  created_at: string;
  [key: string]: unknown;
}

interface RailsResponse {
  data: RailsDiscoveredUrl[];
  meta: {
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

function mapDiscoveredUrl(raw: RailsDiscoveredUrl): DiscoveredUrl {
  const { id, url, source, created_at, ...rest } = raw;
  return {
    id,
    url,
    source,
    created_at,
    metadata: rest,
  };
}

export async function getDiscoveredUrls(
  apiKey: string,
  baseUrl: string,
  params?: {
    status?: 'pending' | 'processed' | 'needs_indexing' | 'all';
    page?: number;
    per_page?: number;
  }
): Promise<DiscoveredUrlsResponse> {
  const url = new URL('/api/discovered_urls', baseUrl);

  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.page) {
    url.searchParams.append('page', params.page.toString());
  }
  if (params?.per_page) {
    url.searchParams.append('per_page', params.per_page.toString());
  }

  const response = await adminFetch(url.toString(), {
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
    throw new Error(`Failed to fetch discovered URLs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    urls: data.data.map(mapDiscoveredUrl),
    has_more: data.meta.has_more,
    total_count: data.meta.total_count,
    page: data.meta.page,
    per_page: data.meta.per_page,
  };
}
