import type { Secret, CreateSecretParams } from '../../types.js';

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

export async function createSecret(
  apiKey: string,
  baseUrl: string,
  params: CreateSecretParams
): Promise<Secret> {
  const url = new URL('/api/secrets', baseUrl);

  const body: Record<string, unknown> = {
    slug: params.slug,
    onepassword_item_id: params.onepassword_item_id,
  };

  if (params.title !== undefined) {
    body.title = params.title;
  }
  if (params.description !== undefined) {
    body.description = params.description;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to create secret: ${response.status} ${response.statusText}`);
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
