import type { Secret, UpdateSecretParams } from '../../types.js';

interface RailsSecret {
  id: number;
  slug: string;
  onepassword_item_id: string;
  title?: string;
  description?: string;
  mcp_servers_count?: number;
  mcp_server_slugs?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function updateSecret(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string,
  params: UpdateSecretParams
): Promise<Secret> {
  const url = new URL(`/api/secrets/${idOrSlug}`, baseUrl);

  const body: Record<string, unknown> = {};

  if (params.slug !== undefined) {
    body.slug = params.slug;
  }
  if (params.onepassword_item_id !== undefined) {
    body.onepassword_item_id = params.onepassword_item_id;
  }
  if (params.title !== undefined) {
    body.title = params.title;
  }
  if (params.description !== undefined) {
    body.description = params.description;
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`Secret with ID/slug ${idOrSlug} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to update secret: ${response.status} ${response.statusText}`);
  }

  const secret = (await response.json()) as RailsSecret;

  return {
    id: secret.id,
    slug: secret.slug,
    onepassword_item_id: secret.onepassword_item_id,
    title: secret.title,
    description: secret.description,
    mcp_servers_count: secret.mcp_servers_count,
    mcp_server_slugs: secret.mcp_server_slugs,
    created_at: secret.created_at,
    updated_at: secret.updated_at,
  };
}
