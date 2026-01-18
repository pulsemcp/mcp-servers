import type { OfficialMirrorRest } from '../../types.js';

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

export async function getOfficialMirror(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<OfficialMirrorRest> {
  const url = new URL(`/api/official_mirrors/${id}`, baseUrl);

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
      throw new Error(`Official mirror with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch official mirror: ${response.status} ${response.statusText}`);
  }

  const mirror = (await response.json()) as RailsOfficialMirror;

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
