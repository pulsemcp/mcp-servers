import type { Post } from '../../types.js';

interface RailsPostsResponse {
  data: Post[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    items_per_page: number;
  };
}

export async function getPost(apiKey: string, baseUrl: string, slug: string): Promise<Post> {
  // Use the posts list endpoint with search to find the post
  // The list endpoint returns most fields except body
  const url = new URL('/posts', baseUrl);
  url.searchParams.set('search', slug);
  url.searchParams.set('per_page', '100'); // Increase to ensure we find it

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

  const data = (await response.json()) as RailsPostsResponse;
  const posts = data.data || [];

  // Find the post with exact slug match
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }

  // Return the post - note that body field will be missing from list response
  // This is a known limitation until the Rails app adds JSON support to posts#show
  return post;
}
