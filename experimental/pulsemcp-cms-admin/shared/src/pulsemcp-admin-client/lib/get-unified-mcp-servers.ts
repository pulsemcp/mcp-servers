import type {
  UnifiedMCPServer,
  UnifiedMCPServersResponse,
  MCPServerTag,
  MCPServerRemote,
  CanonicalUrlParams,
} from '../../types.js';

// Rails API response structure for implementations search
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
  mcp_server?: {
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
  } | null;
}

interface RailsSearchResponse {
  data: RailsImplementation[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
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

    // Timestamps (use implementation timestamps as they're more relevant)
    created_at: impl.created_at,
    updated_at: impl.updated_at,
  };
}

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
