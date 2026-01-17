import type { UnofficialMirror } from '../../types.js';

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

export async function getUnofficialMirror(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<UnofficialMirror> {
  const url = new URL(`/api/unofficial_mirrors/${id}`, baseUrl);

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
      throw new Error(`Unofficial mirror with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch unofficial mirror: ${response.status} ${response.statusText}`);
  }

  const mirror = (await response.json()) as RailsUnofficialMirror;

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
