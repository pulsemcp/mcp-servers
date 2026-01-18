import type { McpJson, CreateMcpJsonParams } from '../../types.js';

interface RailsMcpJson {
  id: number;
  mcp_servers_unofficial_mirror_id: number;
  unofficial_mirror_name?: string;
  unofficial_mirror_version?: string;
  title: string;
  description?: string;
  value: Record<string, unknown>;
  server_key?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createMcpJson(
  apiKey: string,
  baseUrl: string,
  params: CreateMcpJsonParams
): Promise<McpJson> {
  const url = new URL('/api/mcp_jsons', baseUrl);

  const body: Record<string, unknown> = {
    mcp_servers_unofficial_mirror_id: params.mcp_servers_unofficial_mirror_id,
    title: params.title,
    value: typeof params.value === 'string' ? params.value : JSON.stringify(params.value),
  };

  if (params.description !== undefined) {
    body.description = params.description;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to create MCP JSON: ${response.status} ${response.statusText}`);
  }

  const mcpJson = (await response.json()) as RailsMcpJson;

  return {
    id: mcpJson.id,
    mcp_servers_unofficial_mirror_id: mcpJson.mcp_servers_unofficial_mirror_id,
    unofficial_mirror_name: mcpJson.unofficial_mirror_name,
    unofficial_mirror_version: mcpJson.unofficial_mirror_version,
    title: mcpJson.title,
    description: mcpJson.description,
    value: mcpJson.value,
    server_key: mcpJson.server_key,
    created_at: mcpJson.created_at,
    updated_at: mcpJson.updated_at,
  };
}
