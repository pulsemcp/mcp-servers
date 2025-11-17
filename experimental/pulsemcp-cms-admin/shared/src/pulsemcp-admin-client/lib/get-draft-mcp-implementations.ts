import type { MCPImplementationsResponse } from '../../types.js';

interface RailsImplementationsResponse {
  data: Array<{
    id: number;
    name: string;
    short_description?: string;
    description?: string;
    type: 'server' | 'client';
    status: 'draft' | 'live' | 'archived';
    slug: string;
    url?: string;
    provider_name?: string;
    github_stars?: number;
    classification?: 'official' | 'community' | 'reference';
    implementation_language?: string;
    mcp_server_id?: number | null;
    mcp_client_id?: number | null;
    created_at?: string;
    updated_at?: string;
  }>;
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    items_per_page: number;
  };
}

export async function getDraftMCPImplementations(
  apiKey: string,
  baseUrl: string,
  params?: {
    page?: number;
    search?: string;
  }
): Promise<MCPImplementationsResponse> {
  const url = new URL('/api/implementations/drafts', baseUrl);

  // Add query parameters if provided
  if (params?.page) {
    url.searchParams.append('page', params.page.toString());
  }
  if (params?.search) {
    url.searchParams.append('search', params.search);
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
    throw new Error(
      `Failed to fetch draft implementations: ${response.status} ${response.statusText}`
    );
  }

  // Parse the JSON response
  const data = (await response.json()) as RailsImplementationsResponse;

  // Handle the Rails JSON structure with data and meta
  if (data.data && data.meta) {
    return {
      implementations: data.data.map((impl) => ({
        id: impl.id,
        name: impl.name,
        short_description: impl.short_description,
        description: impl.description,
        type: impl.type,
        status: impl.status,
        slug: impl.slug,
        url: impl.url,
        provider_name: impl.provider_name,
        github_stars: impl.github_stars,
        classification: impl.classification,
        implementation_language: impl.implementation_language,
        mcp_server_id: impl.mcp_server_id,
        mcp_client_id: impl.mcp_client_id,
        created_at: impl.created_at,
        updated_at: impl.updated_at,
      })),
      pagination: {
        current_page: data.meta.current_page,
        total_pages: data.meta.total_pages,
        total_count: data.meta.total_count,
      },
    };
  }

  // Fallback for unexpected response format
  return {
    implementations: [],
    pagination: undefined,
  };
}
