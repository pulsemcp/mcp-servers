// Post metadata types matching the PulseMCP API
export interface Post {
  id: number;
  title: string;
  body?: string; // Optional because list endpoint doesn't return it
  slug: string;
  author_id: number;
  status: 'draft' | 'live' | string; // Allow string for flexibility
  category: 'newsletter' | 'other' | string; // Allow string for flexibility
  image_url?: string;
  preview_image_url?: string;
  share_image?: string;
  title_tag?: string;
  short_title?: string;
  short_description?: string;
  description_tag?: string;
  last_updated?: string;
  table_of_contents?: unknown;
  featured_mcp_server_ids?: number[];
  featured_mcp_client_ids?: number[];
  created_at: string;
  updated_at: string;
  author?: {
    id: number;
    name: string;
  };
}

export interface PostsResponse {
  posts: Post[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface CreatePostParams {
  title: string;
  body: string;
  slug: string;
  author_id: number;
  status?: 'draft' | 'live';
  category?: 'newsletter' | 'other';
  image_url?: string;
  preview_image_url?: string;
  share_image?: string;
  title_tag?: string;
  short_title?: string;
  short_description?: string;
  description_tag?: string;
  last_updated?: string;
  table_of_contents?: unknown;
  featured_mcp_server_ids?: number[];
  featured_mcp_client_ids?: number[];
}

export type UpdatePostParams = Partial<CreatePostParams>;

export interface ImageUploadResponse {
  url: string;
}

export interface Author {
  id: number;
  name: string;
  slug: string;
  bio?: string;
  image_url?: string; // API returns image_url, not avatar_url
  created_at: string;
  updated_at: string;
}

export interface AuthorsResponse {
  authors: Author[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface MCPServerTag {
  id: number;
  name: string;
  slug: string;
}

export interface MCPServerRemote {
  id: number;
  display_name?: string;
  url_direct?: string;
  url_setup?: string;
  transport?: string; // e.g., "sse", "streamable_http"
  host_platform?: string; // e.g., "smithery", "superinterface"
  host_infrastructure?: string; // e.g., "cloudflare", "vercel", "fly_io"
  authentication_method?: string; // e.g., "open", "oauth", "api_key"
  cost?: string; // e.g., "free", "free_tier", "paid"
  status?: string; // e.g., "live", "draft"
  internal_notes?: string;
}

export interface RemoteEndpointParams {
  id?: string | number; // ID of existing remote (number from get_draft, string also accepted) or omit for new
  url_direct?: string;
  url_setup?: string;
  transport?: string; // e.g., "sse", "streamable_http"
  host_platform?: string; // e.g., "smithery", "superinterface"
  host_infrastructure?: string; // e.g., "cloudflare", "fly_io"
  authentication_method?: string; // e.g., "open", "oauth"
  cost?: string; // e.g., "free", "paid"
  status?: string; // Status - defaults to "live"
  display_name?: string;
  internal_notes?: string;
}

export interface CanonicalUrlParams {
  url: string;
  scope: 'domain' | 'subdomain' | 'subfolder' | 'url';
  note?: string;
}

export interface MCPServer {
  id: number;
  slug: string;
  // Note: name and description come from McpImplementation, not McpServer
  created_at?: string;
  updated_at?: string;
  classification?: string;
  implementation_language?: string;
  registry_package_id?: number | null;
  registry_package_soft_verified?: boolean;
  downloads_estimate_last_7_days?: number;
  downloads_estimate_last_30_days?: number;
  downloads_estimate_total?: number;
  downloads_estimate_most_recent_week?: number;
  downloads_estimate_last_four_weeks?: number;
  visitors_estimate_total?: number;
  mcp_server_remotes_count?: number;
  tags?: MCPServerTag[];
  remotes?: MCPServerRemote[];
}

export interface MCPClient {
  id: number;
  slug: string;
  // Note: name and description come from McpImplementation, not McpClient
  created_at?: string;
  updated_at?: string;
  featured?: boolean;
  logo_url?: string | null;
}

export interface MCPImplementation {
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
  github_stars?: number | null;
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
  // Associated objects (now inline from API)
  mcp_server?: MCPServer | null;
  mcp_client?: MCPClient | null;
  canonical?: CanonicalUrlParams[];
}

export interface MCPImplementationsResponse {
  implementations: MCPImplementation[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
}

export interface SaveMCPImplementationParams {
  name?: string;
  short_description?: string;
  description?: string;
  type?: 'server' | 'client';
  status?: 'draft' | 'live' | 'archived';
  slug?: string;
  url?: string;
  provider_name?: string;
  github_stars?: number | null;
  classification?: 'official' | 'community' | 'reference';
  implementation_language?: string;
  mcp_server_id?: number | null;
  mcp_client_id?: number | null;

  // Provider creation/linking fields
  provider_id?: string | number; // "new" to create, or numeric ID to link existing
  provider_slug?: string; // Optional slug (auto-generated from name if omitted)
  provider_url?: string; // Optional provider website URL

  // GitHub repository fields
  github_owner?: string; // GitHub organization or username
  github_repo?: string; // Repository name
  github_subfolder?: string; // Optional subfolder within repo (for monorepos)

  // Remote endpoints (for servers)
  remote?: RemoteEndpointParams[]; // Array of remote endpoint configurations

  // Canonical URLs
  canonical?: CanonicalUrlParams[]; // Array of canonical URL configurations

  // Other fields
  internal_notes?: string; // Admin-only notes
}

export interface Provider {
  id: number;
  name: string;
  slug: string;
  url?: string;
  implementations_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProvidersResponse {
  providers: Provider[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
}

// Official Mirror Queue Types
export type OfficialMirrorQueueStatus =
  | 'pending'
  | 'pending_new'
  | 'pending_update'
  | 'approved'
  | 'rejected';

export interface OfficialMirrorSummary {
  id: number;
  name: string;
  version: string;
  description?: string;
  github_url?: string;
  website_url?: string;
  published_at?: string;
}

export interface OfficialMirror {
  id: number;
  name: string;
  version: string;
  official_version_id: string;
  description?: string;
  github_url?: string;
  website_url?: string;
  categories?: string[];
  license?: string;
  remotes?: unknown[];
  packages?: unknown[];
  published_at?: string;
  schema_version?: string;
  datetime_ingested?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LinkedServer {
  id: number;
  slug: string;
  classification?: string;
  implementation_language?: string;
  provider_name?: string;
  provider_slug?: string;
  implementation_name?: string;
  implementation_status?: string;
}

export interface OfficialMirrorQueueItem {
  id: number;
  name: string;
  status: OfficialMirrorQueueStatus;
  mirrors_count: number;
  linked_server_slug?: string | null;
  linked_server_id?: number | null;
  latest_mirror?: OfficialMirrorSummary | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfficialMirrorQueueItemDetail {
  id: number;
  name: string;
  status: OfficialMirrorQueueStatus;
  mirrors_count: number;
  linked_server?: LinkedServer | null;
  server_linkage_consistent: boolean;
  mirrors: OfficialMirror[];
  created_at?: string;
  updated_at?: string;
}

export interface OfficialMirrorQueueResponse {
  items: OfficialMirrorQueueItem[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next?: boolean;
    limit?: number;
  };
}

export interface OfficialMirrorQueueActionResponse {
  success: boolean;
  message: string;
  queue_item: OfficialMirrorQueueItem;
}
