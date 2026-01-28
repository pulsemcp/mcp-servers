import type { Redirect, RedirectsResponse, RedirectStatus } from '../../types.js';

interface RailsRedirect {
  id: number;
  from: string;
  to: string;
  status: RedirectStatus;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsRedirect[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapRedirect(redirect: RailsRedirect): Redirect {
  return {
    id: redirect.id,
    from: redirect.from,
    to: redirect.to,
    status: redirect.status,
    created_at: redirect.created_at,
    updated_at: redirect.updated_at,
  };
}

export async function getRedirects(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    status?: RedirectStatus;
    limit?: number;
    offset?: number;
  }
): Promise<RedirectsResponse> {
  const url = new URL('/api/redirects', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
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
    throw new Error(`Failed to fetch redirects: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    redirects: data.data.map(mapRedirect),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
