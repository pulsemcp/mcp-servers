import type { Secret, SecretsResponse } from '../../types.js';

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

interface RailsResponse {
  data: RailsSecret[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapSecret(secret: RailsSecret): Secret {
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

export async function getSecrets(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SecretsResponse> {
  const url = new URL('/api/secrets', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    url.searchParams.append('offset', params.offset.toString());
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
    throw new Error(`Failed to fetch secrets: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    secrets: data.data.map(mapSecret),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
