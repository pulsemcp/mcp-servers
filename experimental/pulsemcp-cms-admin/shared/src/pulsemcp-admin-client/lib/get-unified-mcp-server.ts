import type {
  UnifiedMCPServer,
  MCPServerTag,
  MCPServerRemote,
  CanonicalUrlParams,
} from '../../types.js';

// Rails API response structure for implementation detail
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

interface RailsImplementation {
  id: number;
  name: string;
  short_description?: string;
  description?: string;
  type: 'server' | 'client';
  status: 'draft' | 'live' | 'archived';
  slug: string;
  marketing_url?: string;
  provider_name?: string;
  provider_id?: number | null;
  provider_url?: string;
  provider_slug?: string;
  github_stars?: number | null;
  github_owner?: string;
  github_repo?: string;
  github_subfolder?: string;
  github_created_date?: string;
  github_status?: string;
  github_last_updated?: string;
  classification?: 'official' | 'community' | 'reference';
  implementation_language?: string;
  mcp_server_id?: number | null;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
  canonical?: CanonicalUrlParams[];
  mcp_server?: RailsMCPServer | null;
}

interface RailsSearchResponse {
  data: RailsImplementation[];
}

function mapToUnifiedServer(impl: RailsImplementation): UnifiedMCPServer | null {
  // Only map implementations that have an associated MCPServer
  if (!impl.mcp_server || !impl.mcp_server_id) {
    return null;
  }

  const mcpServer = impl.mcp_server;

  return {
    // Core identification
    id: mcpServer.id,
    slug: mcpServer.slug,
    implementation_id: impl.id,

    // Basic info
    name: impl.name,
    short_description: impl.short_description,
    description: impl.description,
    status: impl.status,
    classification: impl.classification,
    implementation_language: impl.implementation_language,
    url: impl.marketing_url,

    // Provider info
    provider:
      impl.provider_id || impl.provider_name
        ? {
            id: impl.provider_id,
            name: impl.provider_name,
            slug: impl.provider_slug,
            url: impl.provider_url,
          }
        : undefined,

    // Source code location
    source_code:
      impl.github_owner || impl.github_repo
        ? {
            github_owner: impl.github_owner,
            github_repo: impl.github_repo,
            github_subfolder: impl.github_subfolder,
            github_stars: impl.github_stars,
            github_created_date: impl.github_created_date,
            github_last_updated: impl.github_last_updated,
            github_status: impl.github_status,
          }
        : undefined,

    // Canonical URLs
    canonical_urls: impl.canonical,

    // Remote endpoints
    remotes: mcpServer.remotes?.map((r) => ({
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

    // Tags
    tags: mcpServer.tags,

    // Registry/download info
    registry_package_id: mcpServer.registry_package_id,
    registry_package_soft_verified: mcpServer.registry_package_soft_verified,
    downloads_estimate_last_7_days: mcpServer.downloads_estimate_last_7_days,
    downloads_estimate_last_30_days: mcpServer.downloads_estimate_last_30_days,
    downloads_estimate_total: mcpServer.downloads_estimate_total,

    // Internal notes
    internal_notes: impl.internal_notes,

    // Timestamps
    created_at: impl.created_at,
    updated_at: impl.updated_at,
  };
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
      implementation_id: 0, // No implementation
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
