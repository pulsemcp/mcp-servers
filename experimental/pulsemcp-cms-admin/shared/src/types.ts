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
  avatar_url?: string;
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
  name: string;
  slug: string;
  description?: string;
}

export interface MCPClient {
  id: number;
  name: string;
  slug: string;
  description?: string;
}
