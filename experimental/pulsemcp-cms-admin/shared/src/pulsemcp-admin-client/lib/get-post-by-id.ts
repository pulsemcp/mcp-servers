import type { Post } from '../../types.js';

export async function getPostById(apiKey: string, baseUrl: string, id: number): Promise<Post> {
  const url = new URL(`/supervisor/posts/${id}`, baseUrl);

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
      throw new Error(`Post not found with ID: ${id}`);
    }
    throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Post;
  return data;
}
