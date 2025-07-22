import type { Post, UpdatePostParams } from '../../types.js';

export async function updatePost(
  apiKey: string,
  baseUrl: string,
  slug: string,
  params: UpdatePostParams
): Promise<Post> {
  const url = new URL(`/posts/${slug}`, baseUrl);

  // Build form data for the PUT request
  const formData = new URLSearchParams();

  // Add all provided fields
  if (params.title !== undefined) formData.append('post[title]', params.title);
  if (params.body !== undefined) formData.append('post[body]', params.body);
  if (params.slug !== undefined) formData.append('post[slug]', params.slug);
  if (params.author_id !== undefined)
    formData.append('post[author_id]', params.author_id.toString());
  if (params.status !== undefined) formData.append('post[status]', params.status);
  if (params.category !== undefined) formData.append('post[category]', params.category);
  if (params.image_url !== undefined) formData.append('post[image_url]', params.image_url);
  if (params.preview_image_url !== undefined)
    formData.append('post[preview_image_url]', params.preview_image_url);
  if (params.share_image !== undefined) formData.append('post[share_image]', params.share_image);
  if (params.title_tag !== undefined) formData.append('post[title_tag]', params.title_tag);
  if (params.short_title !== undefined) formData.append('post[short_title]', params.short_title);
  if (params.short_description !== undefined)
    formData.append('post[short_description]', params.short_description);
  if (params.description_tag !== undefined)
    formData.append('post[description_tag]', params.description_tag);
  if (params.last_updated !== undefined) formData.append('post[last_updated]', params.last_updated);
  if (params.table_of_contents !== undefined)
    formData.append('post[table_of_contents]', JSON.stringify(params.table_of_contents));

  // Handle arrays for featured servers/clients
  if (params.featured_mcp_server_ids !== undefined) {
    params.featured_mcp_server_ids.forEach((id) => {
      formData.append('post[featured_mcp_server_ids][]', id.toString());
    });
  }
  if (params.featured_mcp_client_ids !== undefined) {
    params.featured_mcp_client_ids.forEach((id) => {
      formData.append('post[featured_mcp_client_ids][]', id.toString());
    });
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
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
    if (response.status === 404) {
      throw new Error(`Post not found: ${slug}`);
    }
    if (response.status === 422) {
      const errorData = await response.text();
      throw new Error(`Validation failed: ${errorData}`);
    }
    throw new Error(`Failed to update post: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Post;
  return data;
}
