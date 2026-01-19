import type { UnifiedMCPServer, MCPServerTag, MCPServerRemote } from '../../types.js';
import { mapToUnifiedServer, type RailsImplementation } from './unified-mcp-server-mapper.js';

// Rails API response structure for MCPServer detail endpoint
interface RailsMCPServer {
  id: number;
  slug: string;
  classification?: string;
  implementation_language?: string;
  registry_package_id?: number | null;
  registry_package_soft_verified?: boolean;
  downloads_estimate_last_7_days?: number;
  downloads_estimate_last_30_days?: number;
  downloads_estimate_total?: number;
  mcp_server_remotes_count?: number;
  tags?: MCPServerTag[];
  remotes?: MCPServerRemote[];
  created_at?: string;
  updated_at?: string;
}

interface RailsSearchResponse {
  data: RailsImplementation[];
}

/**
 * Get a unified MCP server by its slug.
 * This fetches the MCPServer and its associated MCPImplementation data.
 */
export async function getUnifiedMCPServer(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<UnifiedMCPServer> {
  // First, get the MCPServer to get its ID
  const serverUrl = new URL(`/supervisor/mcp_servers/${slug}`, baseUrl);

  const serverResponse = await fetch(serverUrl.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!serverResponse.ok) {
    if (serverResponse.status === 401) {
      throw new Error('Invalid API key');
    }
    if (serverResponse.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (serverResponse.status === 404) {
      throw new Error(`MCP server not found: ${slug}`);
    }
    throw new Error(
      `Failed to fetch MCP server: ${serverResponse.status} ${serverResponse.statusText}`
    );
  }

  const mcpServerData = (await serverResponse.json()) as RailsMCPServer;

  // Now search for the implementation that references this MCPServer
  // Use a search that includes the slug to narrow down results
  const searchUrl = new URL('/api/implementations/search', baseUrl);
  searchUrl.searchParams.append('q', slug);
  searchUrl.searchParams.append('type', 'server');
  searchUrl.searchParams.append('status', 'all');
  searchUrl.searchParams.append('limit', '50');

  const searchResponse = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!searchResponse.ok) {
    throw new Error(
      `Failed to fetch implementation data: ${searchResponse.status} ${searchResponse.statusText}`
    );
  }

  const searchData = (await searchResponse.json()) as RailsSearchResponse;

  // Find the implementation that matches this MCPServer's ID
  const matchingImpl = searchData.data.find(
    (impl: RailsImplementation) => impl.mcp_server_id === mcpServerData.id
  );

  if (!matchingImpl) {
    // If no matching implementation found, construct a minimal unified server from MCPServer data
    return {
      id: mcpServerData.id,
      slug: mcpServerData.slug,
      implementation_id: null, // No implementation exists for this server
      name: mcpServerData.slug, // Use slug as name fallback
      status: 'draft' as const,
      classification: mcpServerData.classification as
        | 'official'
        | 'community'
        | 'reference'
        | undefined,
      implementation_language: mcpServerData.implementation_language,
      remotes: mcpServerData.remotes?.map((r: MCPServerRemote) => ({
        id: r.id,
        display_name: r.display_name,
        url_direct: r.url_direct,
        url_setup: r.url_setup,
        transport: r.transport,
        host_platform: r.host_platform,
        host_infrastructure: r.host_infrastructure,
        authentication_method: r.authentication_method,
        cost: r.cost,
        status: r.status,
        internal_notes: r.internal_notes,
      })),
      tags: mcpServerData.tags,
      registry_package_id: mcpServerData.registry_package_id,
      registry_package_soft_verified: mcpServerData.registry_package_soft_verified,
      downloads_estimate_last_7_days: mcpServerData.downloads_estimate_last_7_days,
      downloads_estimate_last_30_days: mcpServerData.downloads_estimate_last_30_days,
      downloads_estimate_total: mcpServerData.downloads_estimate_total,
      created_at: mcpServerData.created_at,
      updated_at: mcpServerData.updated_at,
    };
  }

  // Merge MCPServer data with implementation data for complete picture
  matchingImpl.mcp_server = {
    ...mcpServerData,
    remotes: mcpServerData.remotes,
    tags: mcpServerData.tags,
  };

  const unified = mapToUnifiedServer(matchingImpl);
  if (!unified) {
    throw new Error(`Failed to map MCP server data for: ${slug}`);
  }

  return unified;
}
