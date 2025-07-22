import type { Post } from '../../types.js';

export interface UpdateSupervisorPostInput {
  title?: string;
  slug?: string;
  status?: 'draft' | 'published' | 'archived';
  excerpt?: string;
  content?: string;
  author_id?: number;
  featured?: boolean;
  meta_description?: string;
  meta_keywords?: string;
  social_media_image_url?: string;
  published_at?: string;
  newsletter_ids?: number[];
  mcp_server_ids?: number[];
  mcp_client_ids?: number[];
}

export async function updateSupervisorPost(
  apiKey: string,
  baseUrl: string,
  id: number,
  input: UpdateSupervisorPostInput
): Promise<Post> {
  const url = new URL(`/supervisor/posts/${id}`, baseUrl);

  const formData = new FormData();

  if (input.title !== undefined) {
    formData.append('post[title]', input.title);
  }
  if (input.slug !== undefined) {
    formData.append('post[slug]', input.slug);
  }
  if (input.status !== undefined) {
    formData.append('post[status]', input.status);
  }
  if (input.excerpt !== undefined) {
    formData.append('post[excerpt]', input.excerpt);
  }
  if (input.content !== undefined) {
    formData.append('post[content]', input.content);
  }
  if (input.author_id !== undefined) {
    formData.append('post[author_id]', input.author_id.toString());
  }
  if (input.featured !== undefined) {
    formData.append('post[featured]', input.featured.toString());
  }
  if (input.meta_description !== undefined) {
    formData.append('post[meta_description]', input.meta_description);
  }
  if (input.meta_keywords !== undefined) {
    formData.append('post[meta_keywords]', input.meta_keywords);
  }
  if (input.social_media_image_url !== undefined) {
    formData.append('post[social_media_image_url]', input.social_media_image_url);
  }
  if (input.published_at !== undefined) {
    formData.append('post[published_at]', input.published_at);
  }

  // Handle array fields
  if (input.newsletter_ids !== undefined) {
    // Clear existing values first
    formData.append('post[newsletter_ids][]', '');
    input.newsletter_ids.forEach((id) => {
      formData.append('post[newsletter_ids][]', id.toString());
    });
  }
  if (input.mcp_server_ids !== undefined) {
    // Clear existing values first
    formData.append('post[mcp_server_ids][]', '');
    input.mcp_server_ids.forEach((id) => {
      formData.append('post[mcp_server_ids][]', id.toString());
    });
  }
  if (input.mcp_client_ids !== undefined) {
    // Clear existing values first
    formData.append('post[mcp_client_ids][]', '');
    input.mcp_client_ids.forEach((id) => {
      formData.append('post[mcp_client_ids][]', id.toString());
    });
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
    body: formData,
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
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(`Validation failed: ${JSON.stringify(errorData)}`);
    }
    throw new Error(`Failed to update post: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Post;
  return data;
}
