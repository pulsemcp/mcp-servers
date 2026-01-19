import type {
  UnifiedMCPServer,
  UpdateUnifiedMCPServerParams,
  SaveMCPImplementationParams,
  MCPServerTag,
  MCPServerRemote,
  CanonicalUrlParams,
} from '../../types.js';

// Rails API response structure
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

function mapToUnifiedServer(impl: RailsImplementation): UnifiedMCPServer | null {
  if (!impl.mcp_server || !impl.mcp_server_id) {
    return null;
  }

  const mcpServer = impl.mcp_server;

  return {
    id: mcpServer.id,
    slug: mcpServer.slug,
    implementation_id: impl.id,
    name: impl.name,
    short_description: impl.short_description,
    description: impl.description,
    status: impl.status,
    classification: impl.classification,
    implementation_language: impl.implementation_language,
    url: impl.marketing_url,
    provider:
      impl.provider_id || impl.provider_name
        ? {
            id: impl.provider_id,
            name: impl.provider_name,
            slug: impl.provider_slug,
            url: impl.provider_url,
          }
        : undefined,
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
    canonical_urls: impl.canonical,
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
    tags: mcpServer.tags,
    registry_package_id: mcpServer.registry_package_id,
    registry_package_soft_verified: mcpServer.registry_package_soft_verified,
    downloads_estimate_last_7_days: mcpServer.downloads_estimate_last_7_days,
    downloads_estimate_last_30_days: mcpServer.downloads_estimate_last_30_days,
    downloads_estimate_total: mcpServer.downloads_estimate_total,
    internal_notes: impl.internal_notes,
    created_at: impl.created_at,
    updated_at: impl.updated_at,
  };
}

/**
 * Update a unified MCP server by its implementation ID.
 * This abstracts the complexity of updating the MCPImplementation and MCPServer relationship.
 */
export async function updateUnifiedMCPServer(
  apiKey: string,
  baseUrl: string,
  implementationId: number,
  params: UpdateUnifiedMCPServerParams
): Promise<UnifiedMCPServer> {
  // Transform unified params to implementation params
  const implParams: SaveMCPImplementationParams = {};

  // Basic info
  if (params.name !== undefined) implParams.name = params.name;
  if (params.short_description !== undefined)
    implParams.short_description = params.short_description;
  if (params.description !== undefined) implParams.description = params.description;
  if (params.status !== undefined) implParams.status = params.status;
  if (params.classification !== undefined) implParams.classification = params.classification;
  if (params.implementation_language !== undefined)
    implParams.implementation_language = params.implementation_language;
  if (params.url !== undefined) implParams.url = params.url;
  if (params.internal_notes !== undefined) implParams.internal_notes = params.internal_notes;

  // Provider handling
  if (params.provider_id !== undefined) implParams.provider_id = params.provider_id;
  if (params.provider_name !== undefined) implParams.provider_name = params.provider_name;
  if (params.provider_slug !== undefined) implParams.provider_slug = params.provider_slug;
  if (params.provider_url !== undefined) implParams.provider_url = params.provider_url;

  // Source code location
  if (params.source_code) {
    if (params.source_code.github_owner !== undefined)
      implParams.github_owner = params.source_code.github_owner;
    if (params.source_code.github_repo !== undefined)
      implParams.github_repo = params.source_code.github_repo;
    if (params.source_code.github_subfolder !== undefined)
      implParams.github_subfolder = params.source_code.github_subfolder;
  }

  // Canonical URLs
  if (params.canonical_urls !== undefined) {
    implParams.canonical = params.canonical_urls;
  }

  // Remote endpoints
  if (params.remotes !== undefined) {
    implParams.remote = params.remotes.map((r) => ({
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

  // Use the existing save-mcp-implementation endpoint
  const { saveMCPImplementation } = await import('./save-mcp-implementation.js');
  const result = await saveMCPImplementation(apiKey, baseUrl, implementationId, implParams);

  // Map the result back to a unified server
  const unified = mapToUnifiedServer(result as unknown as RailsImplementation);
  if (!unified) {
    // If the result doesn't have mcp_server, return a partial response
    return {
      id: 0,
      slug: '',
      implementation_id: result.id,
      name: result.name,
      short_description: result.short_description,
      description: result.description,
      status: result.status,
      classification: result.classification,
      implementation_language: result.implementation_language,
      url: result.url,
      provider:
        result.provider_id || result.provider_name
          ? {
              id: result.provider_id,
              name: result.provider_name,
              slug: result.provider_slug,
              url: result.provider_url,
            }
          : undefined,
      source_code:
        result.github_owner || result.github_repo
          ? {
              github_owner: result.github_owner,
              github_repo: result.github_repo,
              github_subfolder: result.github_subfolder,
              github_stars: result.github_stars,
              github_created_date: result.github_created_date,
              github_last_updated: result.github_last_updated,
              github_status: result.github_status,
            }
          : undefined,
      canonical_urls: result.canonical,
      internal_notes: result.internal_notes,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  return unified;
}
