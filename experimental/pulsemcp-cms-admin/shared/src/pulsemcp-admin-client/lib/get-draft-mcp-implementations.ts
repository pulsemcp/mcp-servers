import type {
  MCPImplementationsResponse,
  MCPServer,
  MCPClient,
  MCPServerTag,
  MCPServerRemote,
} from '../../types.js';

interface RailsServerTag {
  id: number;
  name: string;
  slug: string;
}

interface RailsServerRemote {
  id: number;
  display_name?: string;
  url_direct?: string;
  url_setup?: string;
  transport?: string;
  host_platform?: string;
  host_infrastructure?: string;
  authentication_method?: string;
  cost?: string;
  status?: string;
  internal_notes?: string;
}

interface RailsMCPServer {
  id: number;
  slug: string;
  // Note: name and description come from McpImplementation, not McpServer
  classification?: string;
  implementation_language?: string;
  downloads_estimate_total?: number;
  downloads_estimate_most_recent_week?: number;
  downloads_estimate_last_four_weeks?: number;
  visitors_estimate_total?: number;
  registry_package_id?: number | null;
  registry_package_soft_verified?: boolean;
  mcp_server_remotes_count?: number;
  tags?: RailsServerTag[];
  remotes?: RailsServerRemote[];
}

interface RailsMCPClient {
  id: number;
  slug: string;
  // Note: name and description come from McpImplementation, not McpClient
  featured?: boolean;
  logo_url?: string | null;
}

interface RailsImplementationsResponse {
  data: Array<{
    id: number;
    name: string;
    short_description?: string;
    description?: string;
    type: 'server' | 'client';
    status: 'draft' | 'live' | 'archived';
    slug: string;
    url?: string;
    // Provider info
    provider_name?: string;
    provider_id?: number | null;
    provider_url?: string;
    provider_slug?: string;
    // GitHub info
    github_stars?: number;
    github_owner?: string;
    github_repo?: string;
    github_subfolder?: string;
    github_created_date?: string;
    github_status?: string;
    github_last_updated?: string;
    // Server-specific fields
    classification?: 'official' | 'community' | 'reference';
    implementation_language?: string;
    mcp_server_id?: number | null;
    mcp_client_id?: number | null;
    internal_notes?: string;
    created_at?: string;
    updated_at?: string;
    // Inline associated objects
    mcp_server?: RailsMCPServer | null;
    mcp_client?: RailsMCPClient | null;
  }>;
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    items_per_page: number;
  };
}

function mapServerTags(tags?: RailsServerTag[]): MCPServerTag[] | undefined {
  if (!tags) return undefined;
  return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
}

function mapServerRemotes(remotes?: RailsServerRemote[]): MCPServerRemote[] | undefined {
  if (!remotes) return undefined;
  return remotes.map((r) => ({
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
  }));
}

function mapMCPServer(server?: RailsMCPServer | null): MCPServer | null | undefined {
  if (!server) return server;
  return {
    id: server.id,
    slug: server.slug,
    classification: server.classification,
    implementation_language: server.implementation_language,
    downloads_estimate_total: server.downloads_estimate_total,
    downloads_estimate_most_recent_week: server.downloads_estimate_most_recent_week,
    downloads_estimate_last_four_weeks: server.downloads_estimate_last_four_weeks,
    visitors_estimate_total: server.visitors_estimate_total,
    registry_package_id: server.registry_package_id,
    registry_package_soft_verified: server.registry_package_soft_verified,
    mcp_server_remotes_count: server.mcp_server_remotes_count,
    tags: mapServerTags(server.tags),
    remotes: mapServerRemotes(server.remotes),
  };
}

function mapMCPClient(client?: RailsMCPClient | null): MCPClient | null | undefined {
  if (!client) return client;
  return {
    id: client.id,
    slug: client.slug,
    featured: client.featured,
    logo_url: client.logo_url,
  };
}

export async function getDraftMCPImplementations(
  apiKey: string,
  baseUrl: string,
  params?: {
    page?: number;
    search?: string;
  }
): Promise<MCPImplementationsResponse> {
  const url = new URL('/api/implementations/drafts', baseUrl);

  // Add query parameters if provided
  if (params?.page) {
    url.searchParams.append('page', params.page.toString());
  }
  if (params?.search) {
    url.searchParams.append('search', params.search);
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
    throw new Error(
      `Failed to fetch draft implementations: ${response.status} ${response.statusText}`
    );
  }

  // Parse the JSON response
  const data = (await response.json()) as RailsImplementationsResponse;

  // Handle the Rails JSON structure with data and meta
  if (data.data && data.meta) {
    return {
      implementations: data.data.map((impl) => ({
        id: impl.id,
        name: impl.name,
        short_description: impl.short_description,
        description: impl.description,
        type: impl.type,
        status: impl.status,
        slug: impl.slug,
        url: impl.url,
        // Provider info
        provider_name: impl.provider_name,
        provider_id: impl.provider_id,
        provider_url: impl.provider_url,
        provider_slug: impl.provider_slug,
        // GitHub info
        github_stars: impl.github_stars,
        github_owner: impl.github_owner,
        github_repo: impl.github_repo,
        github_subfolder: impl.github_subfolder,
        github_created_date: impl.github_created_date,
        github_status: impl.github_status,
        github_last_updated: impl.github_last_updated,
        // Server-specific fields
        classification: impl.classification,
        implementation_language: impl.implementation_language,
        mcp_server_id: impl.mcp_server_id,
        mcp_client_id: impl.mcp_client_id,
        internal_notes: impl.internal_notes,
        created_at: impl.created_at,
        updated_at: impl.updated_at,
        // Inline associated objects
        mcp_server: mapMCPServer(impl.mcp_server),
        mcp_client: mapMCPClient(impl.mcp_client),
      })),
      pagination: {
        current_page: data.meta.current_page,
        total_pages: data.meta.total_pages,
        total_count: data.meta.total_count,
      },
    };
  }

  // Fallback for unexpected response format
  return {
    implementations: [],
    pagination: undefined,
  };
}
