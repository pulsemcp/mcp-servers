import type { Post, PostsResponse } from '../../types.js';

export async function getPosts(
  apiKey: string,
  baseUrl: string,
  params?: {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
  }
): Promise<PostsResponse> {
  const url = new URL('/posts', baseUrl);

  // Add query parameters if provided
  if (params?.search) {
    url.searchParams.append('search', params.search);
  }
  if (params?.sort) {
    url.searchParams.append('sort', params.sort);
  }
  if (params?.direction) {
    url.searchParams.append('direction', params.direction);
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
    throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
  }

  // The API returns HTML by default, so we need to parse the response appropriately
  // For JSON endpoints, we expect the server to return proper JSON
  const data = (await response.json()) as PostsResponse | Post[];

  // Handle both response formats
  if (Array.isArray(data)) {
    return {
      posts: data,
      pagination: undefined,
    };
  }

  return data;
}
