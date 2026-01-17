import type { McpJson, McpJsonsResponse } from '../../types.js';

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

interface RailsResponse {
  data: RailsMcpJson[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

function mapMcpJson(mcpJson: RailsMcpJson): McpJson {
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

export async function getMcpJsons(
  apiKey: string,
  baseUrl: string,
  params?: {
    unofficial_mirror_id?: number;
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<McpJsonsResponse> {
  const url = new URL('/api/mcp_jsons', baseUrl);

  if (params?.unofficial_mirror_id) {
    url.searchParams.append('unofficial_mirror_id', params.unofficial_mirror_id.toString());
  }
  if (params?.q) {
    url.searchParams.append('q', params.q);
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
    throw new Error(`Failed to fetch MCP JSONs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  return {
    mcp_jsons: data.data.map(mapMcpJson),
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
