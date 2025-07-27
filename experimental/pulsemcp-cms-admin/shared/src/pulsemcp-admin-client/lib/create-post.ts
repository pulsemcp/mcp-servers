import type { Post, CreatePostParams } from '../../types.js';

export async function createPost(
  apiKey: string,
  baseUrl: string,
  params: CreatePostParams
): Promise<Post> {
  const url = new URL('/posts', baseUrl);

  // Build form data for the POST request
  const formData = new URLSearchParams();

  // Required fields
  formData.append('post[title]', params.title);
  formData.append('post[body]', params.body);
  formData.append('post[slug]', params.slug);
  formData.append('post[author_id]', params.author_id.toString());

  // Optional fields
  if (params.status) formData.append('post[status]', params.status);
  if (params.category) formData.append('post[category]', params.category);
  if (params.image_url) formData.append('post[image_url]', params.image_url);
  if (params.preview_image_url)
    formData.append('post[preview_image_url]', params.preview_image_url);
  if (params.share_image) formData.append('post[share_image]', params.share_image);
  if (params.title_tag) formData.append('post[title_tag]', params.title_tag);
  if (params.short_title) formData.append('post[short_title]', params.short_title);
  if (params.short_description)
    formData.append('post[short_description]', params.short_description);
  if (params.description_tag) formData.append('post[description_tag]', params.description_tag);
  if (params.last_updated) formData.append('post[last_updated]', params.last_updated);
  if (params.table_of_contents) {
    // If table_of_contents is already a string (HTML), send it as-is
    // If it's an object/array, stringify it
    const tocValue =
      typeof params.table_of_contents === 'string'
        ? params.table_of_contents
        : JSON.stringify(params.table_of_contents);
    formData.append('post[table_of_contents]', tocValue);
  }

  // Handle arrays for featured servers/clients
  if (params.featured_mcp_server_ids) {
    params.featured_mcp_server_ids.forEach((id) => {
      formData.append('post[featured_mcp_server_ids][]', id.toString());
    });
  }
  if (params.featured_mcp_client_ids) {
    params.featured_mcp_client_ids.forEach((id) => {
      formData.append('post[featured_mcp_client_ids][]', id.toString());
    });
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      const errors = errorData.errors || ['Validation failed'];
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    throw new Error(`Failed to create post: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as Post;
}
