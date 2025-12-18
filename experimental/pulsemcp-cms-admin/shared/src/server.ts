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
  Provider,
  ProvidersResponse,
  OfficialMirrorQueueStatus,
  OfficialMirrorQueueResponse,
  OfficialMirrorQueueItemDetail,
  OfficialMirrorQueueActionResponse,
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

  getMCPImplementationById(id: number): Promise<MCPImplementation | null>;

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

  searchProviders(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<ProvidersResponse>;

  getProviderById(id: number): Promise<Provider | null>;

  // Official Mirror Queue methods
  getOfficialMirrorQueueItems(params?: {
    status?: OfficialMirrorQueueStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorQueueResponse>;

  getOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueItemDetail>;

  approveOfficialMirrorQueueItem(
    id: number,
    mcpServerSlug: string
  ): Promise<OfficialMirrorQueueActionResponse>;

  approveOfficialMirrorQueueItemWithoutModifying(
    id: number
  ): Promise<OfficialMirrorQueueActionResponse>;

  rejectOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse>;

  addOfficialMirrorToRegularQueue(id: number): Promise<OfficialMirrorQueueActionResponse>;

  unlinkOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse>;
}

// PulseMCP Admin API client implementation
export class PulseMCPAdminClient implements IPulseMCPAdminClient {
  private baseUrl: string;

  constructor(
    private apiKey: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || 'https://admin.pulsemcp.com';
  }

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

  async getMCPImplementationById(id: number): Promise<MCPImplementation | null> {
    const { getMCPImplementationById } = await import(
      './pulsemcp-admin-client/lib/get-mcp-implementation-by-id.js'
    );
    return getMCPImplementationById(this.apiKey, this.baseUrl, id);
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

  async searchProviders(params: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<ProvidersResponse> {
    const { searchProviders } = await import('./pulsemcp-admin-client/lib/search-providers.js');
    return searchProviders(this.apiKey, this.baseUrl, params);
  }

  async getProviderById(id: number): Promise<Provider | null> {
    const { getProviderById } = await import('./pulsemcp-admin-client/lib/get-provider-by-id.js');
    return getProviderById(this.apiKey, this.baseUrl, id);
  }

  // Official Mirror Queue methods
  async getOfficialMirrorQueueItems(params?: {
    status?: OfficialMirrorQueueStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<OfficialMirrorQueueResponse> {
    const { getOfficialMirrorQueueItems } = await import(
      './pulsemcp-admin-client/lib/get-official-mirror-queue-items.js'
    );
    return getOfficialMirrorQueueItems(this.apiKey, this.baseUrl, params);
  }

  async getOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueItemDetail> {
    const { getOfficialMirrorQueueItem } = await import(
      './pulsemcp-admin-client/lib/get-official-mirror-queue-item.js'
    );
    return getOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
  }

  async approveOfficialMirrorQueueItem(
    id: number,
    mcpServerSlug: string
  ): Promise<OfficialMirrorQueueActionResponse> {
    const { approveOfficialMirrorQueueItem } = await import(
      './pulsemcp-admin-client/lib/approve-official-mirror-queue-item.js'
    );
    return approveOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id, mcpServerSlug);
  }

  async approveOfficialMirrorQueueItemWithoutModifying(
    id: number
  ): Promise<OfficialMirrorQueueActionResponse> {
    const { approveOfficialMirrorQueueItemWithoutModifying } = await import(
      './pulsemcp-admin-client/lib/approve-official-mirror-queue-item-without-modifying.js'
    );
    return approveOfficialMirrorQueueItemWithoutModifying(this.apiKey, this.baseUrl, id);
  }

  async rejectOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse> {
    const { rejectOfficialMirrorQueueItem } = await import(
      './pulsemcp-admin-client/lib/reject-official-mirror-queue-item.js'
    );
    return rejectOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
  }

  async addOfficialMirrorToRegularQueue(id: number): Promise<OfficialMirrorQueueActionResponse> {
    const { addOfficialMirrorToRegularQueue } = await import(
      './pulsemcp-admin-client/lib/add-official-mirror-to-regular-queue.js'
    );
    return addOfficialMirrorToRegularQueue(this.apiKey, this.baseUrl, id);
  }

  async unlinkOfficialMirrorQueueItem(id: number): Promise<OfficialMirrorQueueActionResponse> {
    const { unlinkOfficialMirrorQueueItem } = await import(
      './pulsemcp-admin-client/lib/unlink-official-mirror-queue-item.js'
    );
    return unlinkOfficialMirrorQueueItem(this.apiKey, this.baseUrl, id);
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
        const baseUrl = process.env.PULSEMCP_ADMIN_API_URL;

        if (!apiKey) {
          throw new Error('PULSEMCP_ADMIN_API_KEY environment variable must be configured');
        }

        return new PulseMCPAdminClient(apiKey, baseUrl);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
