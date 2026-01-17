import type { Tenant, TenantsResponse } from '../../types.js';

interface RailsTenant {
  id: number;
  slug: string;
  is_admin: boolean;
  enrichments?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsTenant[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapTenant(tenant: RailsTenant): Tenant {
  return {
    id: tenant.id,
    slug: tenant.slug,
    is_admin: tenant.is_admin,
    enrichments: tenant.enrichments,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
  };
}

export async function getTenants(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    is_admin?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<TenantsResponse> {
  const url = new URL('/api/tenants', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.is_admin !== undefined) {
    url.searchParams.append('is_admin', params.is_admin.toString());
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
    throw new Error(`Failed to fetch tenants: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    tenants: data.data.map(mapTenant),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
