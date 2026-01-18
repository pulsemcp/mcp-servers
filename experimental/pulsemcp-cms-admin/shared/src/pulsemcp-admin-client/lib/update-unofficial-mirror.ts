import type { UnofficialMirror, UpdateUnofficialMirrorParams } from '../../types.js';

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

export async function updateUnofficialMirror(
  apiKey: string,
  baseUrl: string,
  id: number,
  params: UpdateUnofficialMirrorParams
): Promise<UnofficialMirror> {
  const url = new URL(`/api/unofficial_mirrors/${id}`, baseUrl);

  const body: Record<string, unknown> = {};

  if (params.name !== undefined) {
    body.name = params.name;
  }
  if (params.version !== undefined) {
    body.version = params.version;
  }
  if (params.jsonb_data !== undefined) {
    body.jsonb_data =
      typeof params.jsonb_data === 'string' ? params.jsonb_data : JSON.stringify(params.jsonb_data);
  }
  if (params.mcp_server_id !== undefined) {
    body.mcp_server_id = params.mcp_server_id;
  }
  if (params.previous_name !== undefined) {
    body.previous_name = params.previous_name;
  }
  if (params.next_name !== undefined) {
    body.next_name = params.next_name;
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`Unofficial mirror with ID ${id} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(
      `Failed to update unofficial mirror: ${response.status} ${response.statusText}`
    );
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
