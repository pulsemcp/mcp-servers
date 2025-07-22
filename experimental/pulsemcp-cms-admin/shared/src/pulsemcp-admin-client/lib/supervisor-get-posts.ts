import type { Post } from '../../types.js';

export interface GetSupervisorPostsOptions {
  search?: string;
  page?: number;
  perPage?: number;
  status?: 'draft' | 'published' | 'archived';
}

export interface GetSupervisorPostsResult {
  posts: Post[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export async function getSupervisorPosts(
  apiKey: string,
  baseUrl: string,
  options: GetSupervisorPostsOptions = {}
): Promise<GetSupervisorPostsResult> {
  const url = new URL('/supervisor/posts', baseUrl);

  // Add query parameters if provided
  if (options.search) {
    url.searchParams.append('search', options.search);
  }
  if (options.page) {
    url.searchParams.append('page', options.page.toString());
  }
  if (options.perPage) {
    url.searchParams.append('per_page', options.perPage.toString());
  }
  if (options.status) {
    url.searchParams.append('status', options.status);
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

  const data = (await response.json()) as GetSupervisorPostsResult;
  return data;
}
