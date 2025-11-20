import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type {
  Post,
  PostsResponse,
  CreatePostParams,
  UpdatePostParams,
  ImageUploadResponse,
  Author,
  AuthorsResponse,
  MCPServer,
  MCPClient,
  MCPImplementation,
  MCPImplementationsResponse,
  SaveMCPImplementationParams,
} from './types.js';

// PulseMCP Admin API client interface
export interface IPulseMCPAdminClient {
  getPosts(params?: {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
  }): Promise<PostsResponse>;

  getPost(slug: string): Promise<Post>;

  createPost(params: CreatePostParams): Promise<Post>;

  updatePost(slug: string, params: UpdatePostParams): Promise<Post>;

  uploadImage(postSlug: string, fileName: string, fileData: Buffer): Promise<ImageUploadResponse>;

  getAuthors(params?: { search?: string; page?: number }): Promise<AuthorsResponse>;

  getAuthorBySlug(slug: string): Promise<Author>;

  getAuthorById(id: number): Promise<Author | null>;

  getMCPServerBySlug(slug: string): Promise<MCPServer>;

  getMCPServerById(id: number): Promise<MCPServer | null>;

  getMCPClientBySlug(slug: string): Promise<MCPClient>;

  getMCPClientById(id: number): Promise<MCPClient | null>;

  searchMCPImplementations(params: {
    query: string;
    type?: 'server' | 'client' | 'all';
    status?: 'draft' | 'live' | 'archived' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<MCPImplementationsResponse>;

  getDraftMCPImplementations(params?: {
    page?: number;
    search?: string;
  }): Promise<MCPImplementationsResponse>;

  saveMCPImplementation(
    id: number,
    params: SaveMCPImplementationParams
  ): Promise<MCPImplementation>;

  sendEmail(params: {
    from_email_address: string;
    from_name: string;
    reply_to_email_address: string;
    to_email_address: string;
    subject: string;
    content: string;
  }): Promise<{
    id: number;
    sender_provider: string;
    send_timestamp_utc: string;
    from_email_address: string;
    to_email_address: string;
    subject: string;
    content_text: string;
    content_html: string;
    campaign_identifier: string;
    created_at: string;
    updated_at: string;
  }>;
}

// PulseMCP Admin API client implementation
export class PulseMCPAdminClient implements IPulseMCPAdminClient {
  private baseUrl = 'https://admin.pulsemcp.com';

  constructor(private apiKey: string) {}

  async getPosts(params?: {
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
  }): Promise<PostsResponse> {
    const { getPosts } = await import('./pulsemcp-admin-client/lib/get-posts.js');
    return getPosts(this.apiKey, this.baseUrl, params);
  }

  async getPost(slug: string): Promise<Post> {
    const { getPost } = await import('./pulsemcp-admin-client/lib/get-post.js');
    return getPost(this.apiKey, this.baseUrl, slug);
  }

  async createPost(params: CreatePostParams): Promise<Post> {
    const { createPost } = await import('./pulsemcp-admin-client/lib/create-post.js');
    return createPost(this.apiKey, this.baseUrl, params);
  }

  async updatePost(slug: string, params: UpdatePostParams): Promise<Post> {
    const { updatePost } = await import('./pulsemcp-admin-client/lib/update-post.js');
    return updatePost(this.apiKey, this.baseUrl, slug, params);
  }

  async uploadImage(
    postSlug: string,
    fileName: string,
    fileData: Buffer
  ): Promise<ImageUploadResponse> {
    const { uploadImage } = await import('./pulsemcp-admin-client/lib/upload-image.js');
    return uploadImage(this.apiKey, this.baseUrl, postSlug, fileName, fileData);
  }

  async getAuthors(params?: { search?: string; page?: number }): Promise<AuthorsResponse> {
    const { getAuthors } = await import('./pulsemcp-admin-client/lib/get-authors.js');
    return getAuthors(this.apiKey, this.baseUrl, params);
  }

  async getAuthorBySlug(slug: string): Promise<Author> {
    const { getAuthorBySlug } = await import('./pulsemcp-admin-client/lib/get-author-by-slug.js');
    return getAuthorBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getAuthorById(id: number): Promise<Author | null> {
    const { getAuthorById } = await import('./pulsemcp-admin-client/lib/get-author-by-id.js');
    return getAuthorById(this.apiKey, this.baseUrl, id);
  }

  async getMCPServerBySlug(slug: string): Promise<MCPServer> {
    const { getMCPServerBySlug } = await import(
      './pulsemcp-admin-client/lib/get-mcp-server-by-slug.js'
    );
    return getMCPServerBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getMCPServerById(id: number): Promise<MCPServer | null> {
    const { getMCPServerById } = await import(
      './pulsemcp-admin-client/lib/get-mcp-server-by-id.js'
    );
    return getMCPServerById(this.apiKey, this.baseUrl, id);
  }

  async getMCPClientBySlug(slug: string): Promise<MCPClient> {
    const { getMCPClientBySlug } = await import(
      './pulsemcp-admin-client/lib/get-mcp-client-by-slug.js'
    );
    return getMCPClientBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getMCPClientById(id: number): Promise<MCPClient | null> {
    const { getMCPClientById } = await import(
      './pulsemcp-admin-client/lib/get-mcp-client-by-id.js'
    );
    return getMCPClientById(this.apiKey, this.baseUrl, id);
  }

  async searchMCPImplementations(params: {
    query: string;
    type?: 'server' | 'client' | 'all';
    status?: 'draft' | 'live' | 'archived' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<MCPImplementationsResponse> {
    const { searchMCPImplementations } = await import(
      './pulsemcp-admin-client/lib/search-mcp-implementations.js'
    );
    return searchMCPImplementations(this.apiKey, this.baseUrl, params);
  }

  async getDraftMCPImplementations(params?: {
    page?: number;
    search?: string;
  }): Promise<MCPImplementationsResponse> {
    const { getDraftMCPImplementations } = await import(
      './pulsemcp-admin-client/lib/get-draft-mcp-implementations.js'
    );
    return getDraftMCPImplementations(this.apiKey, this.baseUrl, params);
  }

  async saveMCPImplementation(
    id: number,
    params: SaveMCPImplementationParams
  ): Promise<MCPImplementation> {
    const { saveMCPImplementation } = await import(
      './pulsemcp-admin-client/lib/save-mcp-implementation.js'
    );
    return saveMCPImplementation(this.apiKey, this.baseUrl, id, params);
  }

  async sendEmail(params: {
    from_email_address: string;
    from_name: string;
    reply_to_email_address: string;
    to_email_address: string;
    subject: string;
    content: string;
  }): Promise<{
    id: number;
    sender_provider: string;
    send_timestamp_utc: string;
    from_email_address: string;
    to_email_address: string;
    subject: string;
    content_text: string;
    content_html: string;
    campaign_identifier: string;
    created_at: string;
    updated_at: string;
  }> {
    const { sendEmail } = await import('./pulsemcp-admin-client/lib/send-email.js');
    return sendEmail(this.apiKey, this.baseUrl, params);
  }
}

export type ClientFactory = () => IPulseMCPAdminClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'pulsemcp-cms-admin',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        // Get configuration from environment variables
        const apiKey = process.env.PULSEMCP_ADMIN_API_KEY;

        if (!apiKey) {
          throw new Error('PULSEMCP_ADMIN_API_KEY environment variable must be configured');
        }

        return new PulseMCPAdminClient(apiKey);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
