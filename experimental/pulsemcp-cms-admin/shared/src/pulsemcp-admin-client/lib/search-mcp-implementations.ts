import type { MCPImplementation, MCPImplementationsResponse } from '../../types.js';

interface RailsMCPImplementationsResponse {
  data: MCPImplementation[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
}

export async function searchMCPImplementations(
  apiKey: string,
  baseUrl: string,
  params: {
    query: string;
    type?: 'server' | 'client' | 'all';
    status?: 'draft' | 'live' | 'archived' | 'all';
    limit?: number;
    offset?: number;
  }
): Promise<MCPImplementationsResponse> {
  // NOTE: This endpoint needs to be implemented in the PulseMCP backend
  // Expected endpoint: /api/v0/implementations/search
  // This is a placeholder implementation that will work once the backend is ready
  const url = new URL('/api/v0/implementations/search', baseUrl);

  // Add query parameters
  url.searchParams.append('q', params.query);

  if (params.type && params.type !== 'all') {
    url.searchParams.append('type', params.type);
  }

  if (params.status && params.status !== 'all') {
    url.searchParams.append('status', params.status);
  }

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
      throw new Error(
        'Search endpoint not yet implemented. See PR description for implementation requirements.'
      );
    }
    throw new Error(
      `Failed to search MCP implementations: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsMCPImplementationsResponse;

  return {
    implementations: data.data || [],
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
