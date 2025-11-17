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

export interface MCPServer {
  id: number;
  name?: string; // Not always present in API response
  slug: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  classification?: string;
  implementation_language?: string;
  registry_package_id?: number | null;
  registry_package_soft_verified?: boolean;
  downloads_estimate_last_7_days?: number;
  downloads_estimate_last_30_days?: number;
  downloads_estimate_total?: number;
}

export interface MCPClient {
  id: number;
  name?: string; // Not always present in API response
  slug: string;
  description?: string;
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
  provider_name?: string;
  github_stars?: number;
  classification?: 'official' | 'community' | 'reference';
  implementation_language?: string;
  mcp_server_id?: number | null;
  mcp_client_id?: number | null;
  created_at?: string;
  updated_at?: string;
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
  github_stars?: number;
  classification?: 'official' | 'community' | 'reference';
  implementation_language?: string;
  mcp_server_id?: number | null;
  mcp_client_id?: number | null;
}
