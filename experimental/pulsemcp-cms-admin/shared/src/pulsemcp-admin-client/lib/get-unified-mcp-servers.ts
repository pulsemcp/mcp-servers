import type { UnifiedMCPServer, UnifiedMCPServersResponse } from '../../types.js';
import { mapToUnifiedServer, type RailsSearchResponse } from './unified-mcp-server-mapper.js';

export async function getUnifiedMCPServers(
  apiKey: string,
  baseUrl: string,
  params?: {
    q?: string;
    status?: 'draft' | 'live' | 'archived' | 'all';
    classification?: 'official' | 'community' | 'reference';
    limit?: number;
    offset?: number;
  }
): Promise<UnifiedMCPServersResponse> {
  const url = new URL('/api/implementations/search', baseUrl);

  // Always filter to servers only
  url.searchParams.append('type', 'server');

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.status && params.status !== 'all') {
    url.searchParams.append('status', params.status);
  }
  if (params?.classification) {
    url.searchParams.append('classification', params.classification);
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
    throw new Error(`Failed to fetch MCP servers: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsSearchResponse;

  // Map implementations to unified servers, filtering out those without an MCPServer
  const servers = data.data
    .map(mapToUnifiedServer)
    .filter((s): s is UnifiedMCPServer => s !== null);

  return {
    servers,
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
