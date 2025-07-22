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

  getMCPServerBySlug(slug: string): Promise<MCPServer>;

  getMCPClientBySlug(slug: string): Promise<MCPClient>;
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

  async getMCPServerBySlug(slug: string): Promise<MCPServer> {
    const { getMCPServerBySlug } = await import(
      './pulsemcp-admin-client/lib/get-mcp-server-by-slug.js'
    );
    return getMCPServerBySlug(this.apiKey, this.baseUrl, slug);
  }

  async getMCPClientBySlug(slug: string): Promise<MCPClient> {
    const { getMCPClientBySlug } = await import(
      './pulsemcp-admin-client/lib/get-mcp-client-by-slug.js'
    );
    return getMCPClientBySlug(this.apiKey, this.baseUrl, slug);
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
