import type { ListTenantServersResponse, TenantServer } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

interface RailsTenantServer {
  id: number;
  tenant_id: number;
  mcp_server_id: number;
  mcp_server_slug: string;
  status: 'active' | 'deleted';
  server_json_selection: string;
  first_touched_at?: string | null;
  touched: boolean;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsTenantServer[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapTenantServer(row: RailsTenantServer): TenantServer {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    mcp_server_id: row.mcp_server_id,
    mcp_server_slug: row.mcp_server_slug,
    status: row.status,
    server_json_selection: row.server_json_selection,
    first_touched_at: row.first_touched_at,
    touched: row.touched,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTenantServers(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string,
  params?: {
    status?: 'active' | 'deleted' | 'all';
    limit?: number;
    offset?: number;
  }
): Promise<ListTenantServersResponse> {
  const url = new URL(`/api/tenants/${idOrSlug}/servers`, baseUrl);

  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset !== undefined) {
    url.searchParams.append('offset', params.offset.toString());
  }

  const response = await adminFetch(url.toString(), {
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
    throw new Error(`Failed to list tenant servers: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    data: data.data.map(mapTenantServer),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
