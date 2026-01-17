import type { Tenant } from '../../types.js';

interface RailsTenant {
  id: number;
  slug: string;
  is_admin: boolean;
  enrichments?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function getTenant(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string
): Promise<Tenant> {
  const url = new URL(`/api/tenants/${idOrSlug}`, baseUrl);

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
      throw new Error(`Tenant with ID/slug ${idOrSlug} not found`);
    }
    throw new Error(`Failed to fetch tenant: ${response.status} ${response.statusText}`);
  }

  const tenant = (await response.json()) as RailsTenant;

  return {
    id: tenant.id,
    slug: tenant.slug,
    is_admin: tenant.is_admin,
    enrichments: tenant.enrichments,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
  };
}
