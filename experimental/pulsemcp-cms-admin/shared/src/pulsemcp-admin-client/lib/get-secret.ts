import type { Secret } from '../../types.js';

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

export async function getSecret(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string
): Promise<Secret> {
  const url = new URL(`/api/secrets/${idOrSlug}`, baseUrl);

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
      throw new Error(`Secret with ID/slug ${idOrSlug} not found`);
    }
    throw new Error(`Failed to fetch secret: ${response.status} ${response.statusText}`);
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
