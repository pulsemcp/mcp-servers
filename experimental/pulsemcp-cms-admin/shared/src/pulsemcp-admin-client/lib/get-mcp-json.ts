import type { McpJson } from '../../types.js';

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

export async function getMcpJson(apiKey: string, baseUrl: string, id: number): Promise<McpJson> {
  const url = new URL(`/api/mcp_jsons/${id}`, baseUrl);

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
      throw new Error(`MCP JSON with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch MCP JSON: ${response.status} ${response.statusText}`);
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
