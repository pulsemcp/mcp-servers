import type { UnofficialMirror, UnofficialMirrorsResponse } from '../../types.js';

interface RailsUnofficialMirror {
  id: number;
  name: string;
  version: string;
  jsonb_data: Record<string, unknown>;
  datetime_ingested?: string;
  mcp_server_id?: number | null;
  mcp_server_slug?: string | null;
  previous_name?: string | null;
  next_name?: string | null;
  proctor_results_count?: number;
  mcp_jsons_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsUnofficialMirror[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapMirror(mirror: RailsUnofficialMirror): UnofficialMirror {
  return {
    id: mirror.id,
    name: mirror.name,
    version: mirror.version,
    jsonb_data: mirror.jsonb_data,
    datetime_ingested: mirror.datetime_ingested,
    mcp_server_id: mirror.mcp_server_id,
    mcp_server_slug: mirror.mcp_server_slug,
    previous_name: mirror.previous_name,
    next_name: mirror.next_name,
    proctor_results_count: mirror.proctor_results_count,
    mcp_jsons_count: mirror.mcp_jsons_count,
    created_at: mirror.created_at,
    updated_at: mirror.updated_at,
  };
}

export async function getUnofficialMirrors(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    mcp_server_id?: number;
    limit?: number;
    offset?: number;
  }
): Promise<UnofficialMirrorsResponse> {
  const url = new URL('/api/unofficial_mirrors', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.mcp_server_id) {
    url.searchParams.append('mcp_server_id', params.mcp_server_id.toString());
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
    throw new Error(
      `Failed to fetch unofficial mirrors: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as RailsResponse;

  return {
    mirrors: data.data.map(mapMirror),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
