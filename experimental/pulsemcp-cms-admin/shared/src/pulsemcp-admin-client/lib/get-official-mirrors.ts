import type { OfficialMirrorRest, OfficialMirrorsResponse } from '../../types.js';

interface RailsOfficialMirror {
  id: number;
  name: string;
  version: string;
  official_version_id?: string;
  jsonb_data: Record<string, unknown>;
  datetime_ingested?: string;
  mcp_server_id?: number | null;
  mcp_server_slug?: string | null;
  processed?: boolean;
  processing_failure_reason?: string | null;
  queue_id?: number | null;
  queue_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface RailsResponse {
  data: RailsOfficialMirror[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapMirror(mirror: RailsOfficialMirror): OfficialMirrorRest {
  return {
    id: mirror.id,
    name: mirror.name,
    version: mirror.version,
    official_version_id: mirror.official_version_id,
    jsonb_data: mirror.jsonb_data,
    datetime_ingested: mirror.datetime_ingested,
    mcp_server_id: mirror.mcp_server_id,
    mcp_server_slug: mirror.mcp_server_slug,
    processed: mirror.processed,
    processing_failure_reason: mirror.processing_failure_reason,
    queue_id: mirror.queue_id,
    queue_status: mirror.queue_status,
    created_at: mirror.created_at,
    updated_at: mirror.updated_at,
  };
}

export async function getOfficialMirrors(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    mcp_server_id?: number;
    status?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<OfficialMirrorsResponse> {
  const url = new URL('/api/official_mirrors', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.mcp_server_id) {
    url.searchParams.append('mcp_server_id', params.mcp_server_id.toString());
  }
  if (params?.status) {
    url.searchParams.append('status', params.status);
  }
  if (params?.processed !== undefined) {
    url.searchParams.append('processed', params.processed.toString());
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
    throw new Error(`Failed to fetch official mirrors: ${response.status} ${response.statusText}`);
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
