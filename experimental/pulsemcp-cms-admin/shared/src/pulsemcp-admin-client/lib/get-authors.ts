import type { Author, AuthorsResponse } from '../../types.js';

interface RailsAuthorsResponse {
  data: Author[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    items_per_page: number;
  };
}

export async function getAuthors(
  apiKey: string,
  baseUrl: string,
  params?: {
    search?: string;
    page?: number;
  }
): Promise<AuthorsResponse> {
  // Use the supervisor endpoint which supports JSON
  const url = new URL('/supervisor/authors', baseUrl);

  // Add query parameters if provided
  if (params?.search) {
    url.searchParams.append('search', params.search);
  }
  if (params?.page) {
    url.searchParams.append('page', params.page.toString());
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
    throw new Error(`Failed to fetch authors: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsAuthorsResponse;

  return {
    authors: data.data || [],
    pagination: data.meta
      ? {
          current_page: data.meta.current_page,
          total_pages: data.meta.total_pages,
          total_count: data.meta.total_count,
        }
      : undefined,
  };
}
