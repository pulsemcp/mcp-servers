import type { Provider, ProvidersResponse } from '../../types.js';

interface RailsProvidersResponse {
  data: Provider[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
}

export async function searchProviders(
  apiKey: string,
  baseUrl: string,
  params: {
    query: string;
    limit?: number;
    offset?: number;
  }
): Promise<ProvidersResponse> {
  // Endpoint implemented at: /api/providers/search
  // Requires admin authentication via X-API-Key header
  const url = new URL('/api/providers/search', baseUrl);

  // Add query parameters
  url.searchParams.append('q', params.query);

  if (params.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }

  if (params.offset) {
    url.searchParams.append('offset', params.offset.toString());
  }

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
    if (response.status === 404) {
      throw new Error('Providers search endpoint not found');
    }
    throw new Error(`Failed to search providers: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsProvidersResponse;

  return {
    providers: data.data || [],
    pagination: data.meta
      ? {
          current_page: data.meta.current_page,
          total_pages: data.meta.total_pages,
          total_count: data.meta.total_count,
          has_next: data.meta.has_next,
          limit: data.meta.limit,
        }
      : undefined,
  };
}
