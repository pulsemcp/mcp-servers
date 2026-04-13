import type { Tenant, CreateTenantParams } from '../../types.js';

interface RailsTenant {
  id: number;
  slug: string;
  is_admin: boolean;
  enrichments?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function createTenant(
  apiKey: string,
  baseUrl: string,
  params: CreateTenantParams
): Promise<Tenant> {
  const url = new URL('/api/tenants', baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ slug: params.slug }),
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
    throw new Error(`Failed to create tenant: ${response.status} ${response.statusText}`);
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
