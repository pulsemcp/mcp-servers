import type { PostsResponse } from '../../types.js';

interface RailsPostsResponse {
  data: Array<{
    id: number;
    slug: string;
    title: string;
    short_title?: string;
    short_description?: string;
    category: string;
    status: string;
    author_id: number;
    created_at: string;
    updated_at: string;
    last_updated?: string;
  }>;
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    items_per_page: number;
  };
}

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

  // Parse the JSON response
  const data = (await response.json()) as RailsPostsResponse;

  // Handle the Rails JSON structure with data and meta
  if (data.data && data.meta) {
    return {
      posts: data.data.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        short_title: post.short_title,
        short_description: post.short_description,
        category: post.category,
        status: post.status,
        author_id: post.author_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
        last_updated: post.last_updated,
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
    posts: [],
    pagination: undefined,
  };
}
