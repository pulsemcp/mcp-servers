import type { IPulseMCPAdminClient } from '../server.js';
import type {
  Post,
  ImageUploadResponse,
  Author,
  MCPServer,
  MCPClient,
  MCPImplementation,
  MCPImplementationsResponse,
  Provider,
  ProvidersResponse,
  OfficialMirrorQueueItem,
  OfficialMirrorQueueItemDetail,
  OfficialMirrorQueueResponse,
  OfficialMirrorQueueActionResponse,
} from '../types.js';

interface MockData {
  posts?: Post[];
  postsBySlug?: Record<string, Post>;
  createPostResponse?: Post;
  updatePostResponse?: Post;
  uploadImageResponse?: ImageUploadResponse;
  authors?: Author[];
  authorsBySlug?: Record<string, Author>;
  mcpServersBySlug?: Record<string, MCPServer>;
  mcpClientsBySlug?: Record<string, MCPClient>;
  implementations?: MCPImplementation[];
  implementationsResponse?: MCPImplementationsResponse;
  draftImplementationsResponse?: MCPImplementationsResponse;
  providers?: Provider[];
  providersResponse?: ProvidersResponse;
  // Official mirror queue mock data
  officialMirrorQueueItems?: OfficialMirrorQueueItem[];
  officialMirrorQueueItemsResponse?: OfficialMirrorQueueResponse;
  officialMirrorQueueItemDetail?: OfficialMirrorQueueItemDetail;
  officialMirrorQueueActionResponse?: OfficialMirrorQueueActionResponse;
  errors?: {
    getPosts?: Error;
    getPost?: Error;
    createPost?: Error;
    updatePost?: Error;
    uploadImage?: Error;
    getAuthors?: Error;
    getAuthorBySlug?: Error;
    getMCPServerBySlug?: Error;
    getMCPClientBySlug?: Error;
    searchMCPImplementations?: Error;
    getDraftMCPImplementations?: Error;
    saveMCPImplementation?: Error;
    sendEmail?: Error;
    searchProviders?: Error;
    getProviderById?: Error;
    // Official mirror queue errors
    getOfficialMirrorQueueItems?: Error;
    getOfficialMirrorQueueItem?: Error;
    approveOfficialMirrorQueueItem?: Error;
    approveOfficialMirrorQueueItemWithoutModifying?: Error;
    rejectOfficialMirrorQueueItem?: Error;
    addOfficialMirrorToRegularQueue?: Error;
    unlinkOfficialMirrorQueueItem?: Error;
  };
}

export function createMockPulseMCPAdminClient(mockData: MockData): IPulseMCPAdminClient {
  const defaultPost: Post = {
    id: 1,
    title: 'Test Post',
    body: '<p>Test content</p>',
    slug: 'test-post',
    author_id: 1,
    status: 'draft',
    category: 'newsletter',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    author: {
      id: 1,
      name: 'Test Author',
    },
  };

  return {
    async getPosts(params) {
      if (mockData.errors?.getPosts) {
        throw mockData.errors.getPosts;
      }

      let posts = mockData.posts || [defaultPost];

      // Apply search filter if provided
      if (params?.search) {
        posts = posts.filter(
          (post) =>
            post.title.toLowerCase().includes(params.search!.toLowerCase()) ||
            (post.body && post.body.toLowerCase().includes(params.search!.toLowerCase()))
        );
      }

      // Apply sorting
      if (params?.sort) {
        posts = [...posts].sort((a, b) => {
          const aVal = a[params.sort as keyof Post];
          const bVal = b[params.sort as keyof Post];
          const comparison = String(aVal).localeCompare(String(bVal));
          return params.direction === 'desc' ? -comparison : comparison;
        });
      }

      return {
        posts,
        pagination: {
          current_page: params?.page || 1,
          total_pages: 1,
          total_count: posts.length,
        },
      };
    },

    async getPost(slug) {
      if (mockData.errors?.getPost) {
        throw mockData.errors.getPost;
      }

      if (mockData.postsBySlug?.[slug]) {
        return mockData.postsBySlug[slug];
      }

      if (slug === 'test-post') {
        return defaultPost;
      }

      throw new Error(`Post not found: ${slug}`);
    },

    async createPost(params) {
      if (mockData.errors?.createPost) {
        throw mockData.errors.createPost;
      }

      return (
        mockData.createPostResponse || {
          ...defaultPost,
          ...params,
          id: Math.floor(Math.random() * 1000),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
    },

    async updatePost(slug, params) {
      if (mockData.errors?.updatePost) {
        throw mockData.errors.updatePost;
      }

      const existingPost = mockData.postsBySlug?.[slug] || defaultPost;

      return (
        mockData.updatePostResponse || {
          ...existingPost,
          ...params,
          updated_at: new Date().toISOString(),
        }
      );
    },

    async uploadImage(postSlug, fileName, _fileData) {
      if (mockData.errors?.uploadImage) {
        throw mockData.errors.uploadImage;
      }

      return (
        mockData.uploadImageResponse || {
          url: `https://storage.pulsemcp.com/images/newsletter/${postSlug}/${fileName}`,
        }
      );
    },

    async getAuthors(params) {
      if (mockData.errors?.getAuthors) {
        throw mockData.errors.getAuthors;
      }

      let authors = mockData.authors || [
        {
          id: 1,
          name: 'Test Author',
          slug: 'test-author',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      if (params?.search) {
        authors = authors.filter((author) =>
          author.name.toLowerCase().includes(params.search!.toLowerCase())
        );
      }

      return {
        authors,
        pagination: {
          current_page: params?.page || 1,
          total_pages: 1,
          total_count: authors.length,
        },
      };
    },

    async getAuthorBySlug(slug) {
      if (mockData.errors?.getAuthorBySlug) {
        throw mockData.errors.getAuthorBySlug;
      }

      if (mockData.authorsBySlug?.[slug]) {
        return mockData.authorsBySlug[slug];
      }

      return {
        id: 1,
        name: 'Test Author',
        slug: 'test-author',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
    },

    async getMCPServerBySlug(slug) {
      if (mockData.errors?.getMCPServerBySlug) {
        throw mockData.errors.getMCPServerBySlug;
      }

      if (mockData.mcpServersBySlug?.[slug]) {
        return mockData.mcpServersBySlug[slug];
      }

      return {
        id: 1,
        name: 'Test MCP Server',
        slug: slug,
        description: 'A test MCP server',
      };
    },

    async getMCPClientBySlug(slug) {
      if (mockData.errors?.getMCPClientBySlug) {
        throw mockData.errors.getMCPClientBySlug;
      }

      if (mockData.mcpClientsBySlug?.[slug]) {
        return mockData.mcpClientsBySlug[slug];
      }

      return {
        id: 1,
        name: 'Test MCP Client',
        slug: slug,
        description: 'A test MCP client',
      };
    },

    async getAuthorById(id) {
      // Find author in the mock data
      const authors = mockData.authors || [
        {
          id: 1,
          name: 'Test Author',
          slug: 'test-author',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      return authors.find((a) => a.id === id) || null;
    },

    async getMCPServerById(id) {
      // Find server in mock data by ID
      const servers = Object.values(mockData.mcpServersBySlug || {});
      const found = servers.find((s) => s.id === id);

      if (found) return found;

      // Return default if ID matches
      if (id === 1) {
        return {
          id: 1,
          name: 'Test MCP Server',
          slug: 'test-mcp-server',
          description: 'A test MCP server',
        };
      }

      return null;
    },

    async getMCPClientById(id) {
      // Find client in mock data by ID
      const clients = Object.values(mockData.mcpClientsBySlug || {});
      const found = clients.find((c) => c.id === id);

      if (found) return found;

      // Return default if ID matches
      if (id === 1) {
        return {
          id: 1,
          name: 'Test MCP Client',
          slug: 'test-mcp-client',
          description: 'A test MCP client',
        };
      }

      return null;
    },

    async getMCPImplementationById(id) {
      // Find implementation in mock data by ID
      const implementations = mockData.implementations || [];
      const found = implementations.find((impl) => impl.id === id);

      if (found) return found;

      // Return null if not found
      return null;
    },

    async searchMCPImplementations(params) {
      if (mockData.errors?.searchMCPImplementations) {
        throw mockData.errors.searchMCPImplementations;
      }

      if (mockData.implementationsResponse) {
        return mockData.implementationsResponse;
      }

      let implementations = mockData.implementations || [
        {
          id: 1,
          name: 'Test MCP Server',
          slug: 'test-mcp-server',
          type: 'server' as const,
          status: 'live' as const,
          short_description: 'A test MCP server implementation',
          classification: 'community' as const,
          implementation_language: 'TypeScript',
        },
      ];

      // Apply search filter
      if (params.query) {
        const query = params.query.toLowerCase();
        implementations = implementations.filter(
          (impl) =>
            impl.name.toLowerCase().includes(query) ||
            impl.slug.toLowerCase().includes(query) ||
            (impl.short_description && impl.short_description.toLowerCase().includes(query)) ||
            (impl.description && impl.description.toLowerCase().includes(query)) ||
            (impl.provider_name && impl.provider_name.toLowerCase().includes(query))
        );
      }

      // Apply type filter
      if (params.type && params.type !== 'all') {
        implementations = implementations.filter((impl) => impl.type === params.type);
      }

      // Apply status filter
      if (params.status && params.status !== 'all') {
        implementations = implementations.filter((impl) => impl.status === params.status);
      }

      // Apply pagination
      const offset = params.offset || 0;
      const limit = params.limit || 30;
      const totalCount = implementations.length;
      const paginatedImpls = implementations.slice(offset, offset + limit);

      return {
        implementations: paginatedImpls,
        pagination: {
          current_page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          has_next: offset + limit < totalCount,
          limit: limit,
        },
      };
    },

    async getDraftMCPImplementations(params) {
      if (mockData.errors?.getDraftMCPImplementations) {
        throw mockData.errors.getDraftMCPImplementations;
      }

      if (mockData.draftImplementationsResponse) {
        return mockData.draftImplementationsResponse;
      }

      // Filter to only draft implementations
      let implementations = (mockData.implementations || []).filter(
        (impl) => impl.status === 'draft'
      );

      // Apply search filter if provided
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        implementations = implementations.filter(
          (impl) =>
            impl.name.toLowerCase().includes(searchLower) ||
            impl.short_description?.toLowerCase().includes(searchLower) ||
            impl.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const page = params?.page || 1;
      const perPage = 20; // Match Rails default
      const offset = (page - 1) * perPage;
      const paginatedImpls = implementations.slice(offset, offset + perPage);

      return {
        implementations: paginatedImpls,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(implementations.length / perPage),
          total_count: implementations.length,
        },
      };
    },

    async saveMCPImplementation(id, params) {
      if (mockData.errors?.saveMCPImplementation) {
        throw mockData.errors.saveMCPImplementation;
      }

      // Find existing implementation in mock data
      const implementations = mockData.implementations || [];
      const existingImpl = implementations.find((impl) => impl.id === id);

      if (!existingImpl) {
        throw new Error(`MCP implementation not found: ${id}`);
      }

      // Merge params with existing implementation
      // Exclude provider_id from params since it's a request-only field ("new" or numeric ID for linking)
      // The actual provider_id in the response is always a number or null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { provider_id: _providerId, ...restParams } = params;
      const updatedImpl: MCPImplementation = {
        ...existingImpl,
        ...restParams,
        id: id, // Ensure ID doesn't change
        updated_at: new Date().toISOString(),
      };

      return updatedImpl;
    },

    async sendEmail(params) {
      if (mockData.errors?.sendEmail) {
        throw mockData.errors.sendEmail;
      }

      // Mock successful email response
      return {
        id: Math.floor(Math.random() * 10000),
        sender_provider: 'sendgrid',
        send_timestamp_utc: new Date().toISOString(),
        from_email_address: params.from_email_address,
        to_email_address: params.to_email_address,
        subject: params.subject,
        content_text: params.content,
        content_html: `<html><body>${params.content.replace(/\n/g, '<br>')}</body></html>`,
        campaign_identifier: `admin-api-email-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async searchProviders(params) {
      if (mockData.errors?.searchProviders) {
        throw mockData.errors.searchProviders;
      }

      if (mockData.providersResponse) {
        return mockData.providersResponse;
      }

      let providers = mockData.providers || [
        {
          id: 1,
          name: 'Test Provider',
          slug: 'test-provider',
          url: 'https://testprovider.com',
          implementations_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Apply search filter
      if (params.query) {
        const query = params.query.toLowerCase();
        providers = providers.filter(
          (provider) =>
            provider.name.toLowerCase().includes(query) ||
            provider.slug.toLowerCase().includes(query) ||
            (provider.url && provider.url.toLowerCase().includes(query))
        );
      }

      // Apply pagination
      const offset = params.offset || 0;
      const limit = params.limit || 30;
      const totalCount = providers.length;
      const paginatedProviders = providers.slice(offset, offset + limit);

      return {
        providers: paginatedProviders,
        pagination: {
          current_page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          has_next: offset + limit < totalCount,
          limit: limit,
        },
      };
    },

    async getProviderById(id) {
      if (mockData.errors?.getProviderById) {
        throw mockData.errors.getProviderById;
      }

      // Find provider in mock data by ID
      const providers = mockData.providers || [
        {
          id: 1,
          name: 'Test Provider',
          slug: 'test-provider',
          url: 'https://testprovider.com',
          implementations_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const found = providers.find((p) => p.id === id);

      if (found) return found;

      // Return null if not found
      return null;
    },

    // Official Mirror Queue methods
    async getOfficialMirrorQueueItems(params) {
      if (mockData.errors?.getOfficialMirrorQueueItems) {
        throw mockData.errors.getOfficialMirrorQueueItems;
      }

      if (mockData.officialMirrorQueueItemsResponse) {
        return mockData.officialMirrorQueueItemsResponse;
      }

      const defaultItem: OfficialMirrorQueueItem = {
        id: 1,
        name: 'com.example/test-server',
        status: 'pending_new',
        mirrors_count: 1,
        linked_server_slug: null,
        linked_server_id: null,
        latest_mirror: {
          id: 1,
          name: 'com.example/test-server',
          version: '1.0.0',
          description: 'A test MCP server',
          github_url: 'https://github.com/example/test-server',
          website_url: 'https://example.com',
          published_at: '2024-01-01T00:00:00Z',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      let items = mockData.officialMirrorQueueItems || [defaultItem];

      // Apply status filter
      if (params?.status && params.status !== 'pending') {
        items = items.filter((item) => item.status === params.status);
      } else if (params?.status === 'pending') {
        items = items.filter(
          (item) => item.status === 'pending_new' || item.status === 'pending_update'
        );
      }

      // Apply search filter
      if (params?.q) {
        const query = params.q.toLowerCase();
        items = items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.latest_mirror?.github_url?.toLowerCase().includes(query) ||
            item.latest_mirror?.website_url?.toLowerCase().includes(query)
        );
      }

      // Apply pagination
      const offset = params?.offset || 0;
      const limit = params?.limit || 30;
      const totalCount = items.length;
      const paginatedItems = items.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        pagination: {
          current_page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          has_next: offset + limit < totalCount,
          limit: limit,
        },
      };
    },

    async getOfficialMirrorQueueItem(id) {
      if (mockData.errors?.getOfficialMirrorQueueItem) {
        throw mockData.errors.getOfficialMirrorQueueItem;
      }

      if (mockData.officialMirrorQueueItemDetail) {
        return mockData.officialMirrorQueueItemDetail;
      }

      // Check if item exists in mock data
      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      if (!item && id !== 1) {
        throw new Error(`Queue entry not found: ${id}`);
      }

      return {
        id: item?.id || 1,
        name: item?.name || 'com.example/test-server',
        status: item?.status || 'pending_new',
        mirrors_count: item?.mirrors_count || 1,
        linked_server: null,
        server_linkage_consistent: true,
        mirrors: [
          {
            id: 1,
            name: 'com.example/test-server',
            version: '1.0.0',
            official_version_id: 'test-server-1',
            description: 'A test MCP server',
            github_url: 'https://github.com/example/test-server',
            website_url: 'https://example.com',
            categories: ['development'],
            license: 'MIT',
            remotes: [],
            packages: [],
            published_at: '2024-01-01T00:00:00Z',
            schema_version: '2025-09-29',
            datetime_ingested: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
        created_at: item?.created_at || '2024-01-01T00:00:00Z',
        updated_at: item?.updated_at || '2024-01-01T00:00:00Z',
      };
    },

    async approveOfficialMirrorQueueItem(id, mcpServerSlug) {
      if (mockData.errors?.approveOfficialMirrorQueueItem) {
        throw mockData.errors.approveOfficialMirrorQueueItem;
      }

      if (mockData.officialMirrorQueueActionResponse) {
        return mockData.officialMirrorQueueActionResponse;
      }

      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      return {
        success: true,
        message: `Approval job enqueued for linking to ${mcpServerSlug}`,
        queue_item: {
          id: item?.id || id,
          name: item?.name || 'com.example/test-server',
          status: item?.status || 'pending_new',
          mirrors_count: item?.mirrors_count || 1,
          linked_server_slug: mcpServerSlug,
          linked_server_id: 1,
          latest_mirror: item?.latest_mirror || null,
          created_at: item?.created_at || '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      };
    },

    async approveOfficialMirrorQueueItemWithoutModifying(id) {
      if (mockData.errors?.approveOfficialMirrorQueueItemWithoutModifying) {
        throw mockData.errors.approveOfficialMirrorQueueItemWithoutModifying;
      }

      if (mockData.officialMirrorQueueActionResponse) {
        return mockData.officialMirrorQueueActionResponse;
      }

      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      return {
        success: true,
        message: 'Queue item approved without modifying linked server',
        queue_item: {
          id: item?.id || id,
          name: item?.name || 'com.example/test-server',
          status: 'approved' as const,
          mirrors_count: item?.mirrors_count || 1,
          linked_server_slug: item?.linked_server_slug || 'test-server',
          linked_server_id: item?.linked_server_id || 1,
          latest_mirror: item?.latest_mirror || null,
          created_at: item?.created_at || '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      };
    },

    async rejectOfficialMirrorQueueItem(id) {
      if (mockData.errors?.rejectOfficialMirrorQueueItem) {
        throw mockData.errors.rejectOfficialMirrorQueueItem;
      }

      if (mockData.officialMirrorQueueActionResponse) {
        return mockData.officialMirrorQueueActionResponse;
      }

      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      return {
        success: true,
        message: 'Rejection job enqueued',
        queue_item: {
          id: item?.id || id,
          name: item?.name || 'com.example/test-server',
          status: item?.status || 'pending_new',
          mirrors_count: item?.mirrors_count || 1,
          linked_server_slug: item?.linked_server_slug || null,
          linked_server_id: item?.linked_server_id || null,
          latest_mirror: item?.latest_mirror || null,
          created_at: item?.created_at || '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      };
    },

    async addOfficialMirrorToRegularQueue(id) {
      if (mockData.errors?.addOfficialMirrorToRegularQueue) {
        throw mockData.errors.addOfficialMirrorToRegularQueue;
      }

      if (mockData.officialMirrorQueueActionResponse) {
        return mockData.officialMirrorQueueActionResponse;
      }

      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      return {
        success: true,
        message: `Adding ${item?.name || 'com.example/test-server'} to regular queue`,
        queue_item: {
          id: item?.id || id,
          name: item?.name || 'com.example/test-server',
          status: item?.status || 'pending_new',
          mirrors_count: item?.mirrors_count || 1,
          linked_server_slug: item?.linked_server_slug || null,
          linked_server_id: item?.linked_server_id || null,
          latest_mirror: item?.latest_mirror || null,
          created_at: item?.created_at || '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      };
    },

    async unlinkOfficialMirrorQueueItem(id) {
      if (mockData.errors?.unlinkOfficialMirrorQueueItem) {
        throw mockData.errors.unlinkOfficialMirrorQueueItem;
      }

      if (mockData.officialMirrorQueueActionResponse) {
        return mockData.officialMirrorQueueActionResponse;
      }

      const items = mockData.officialMirrorQueueItems || [];
      const item = items.find((i) => i.id === id);

      return {
        success: true,
        message: `Successfully unlinked ${item?.linked_server_slug || 'server'} from this mirror queue`,
        queue_item: {
          id: item?.id || id,
          name: item?.name || 'com.example/test-server',
          status: 'pending_new' as const,
          mirrors_count: item?.mirrors_count || 1,
          linked_server_slug: null,
          linked_server_id: null,
          latest_mirror: item?.latest_mirror || null,
          created_at: item?.created_at || '2024-01-01T00:00:00Z',
          updated_at: new Date().toISOString(),
        },
      };
    },

    // Unofficial Mirror REST API methods (stub implementations)
    async getUnofficialMirrors() {
      return { mirrors: [], pagination: { current_page: 1, total_pages: 1, total_count: 0 } };
    },

    async getUnofficialMirror(id) {
      return {
        id,
        name: 'test-mirror',
        version: '1.0.0',
        jsonb_data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async createUnofficialMirror(params) {
      return {
        id: 1,
        name: params.name,
        version: params.version,
        jsonb_data:
          typeof params.jsonb_data === 'string' ? JSON.parse(params.jsonb_data) : params.jsonb_data,
        mcp_server_id: params.mcp_server_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async updateUnofficialMirror(id, params) {
      return {
        id,
        name: params.name || 'test-mirror',
        version: params.version || '1.0.0',
        jsonb_data: params.jsonb_data
          ? typeof params.jsonb_data === 'string'
            ? JSON.parse(params.jsonb_data)
            : params.jsonb_data
          : {},
        mcp_server_id: params.mcp_server_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async deleteUnofficialMirror() {
      return { success: true, message: 'Unofficial mirror deleted' };
    },

    // Official Mirror REST API methods (stub implementations)
    async getOfficialMirrors() {
      return { mirrors: [], pagination: { current_page: 1, total_pages: 1, total_count: 0 } };
    },

    async getOfficialMirror(id) {
      return {
        id,
        name: 'test-official-mirror',
        version: '1.0.0',
        jsonb_data: {},
        processed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    // Tenant REST API methods (stub implementations)
    async getTenants() {
      return { tenants: [], pagination: { current_page: 1, total_pages: 1, total_count: 0 } };
    },

    async getTenant(idOrSlug) {
      return {
        id: typeof idOrSlug === 'number' ? idOrSlug : 1,
        slug: typeof idOrSlug === 'string' ? idOrSlug : 'test-tenant',
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    // MCP JSON REST API methods (stub implementations)
    async getMcpJsons() {
      return { mcp_jsons: [], pagination: { current_page: 1, total_pages: 1, total_count: 0 } };
    },

    async getMcpJson(id) {
      return {
        id,
        mcp_servers_unofficial_mirror_id: 1,
        title: 'Test MCP JSON',
        value: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async createMcpJson(params) {
      return {
        id: 1,
        mcp_servers_unofficial_mirror_id: params.mcp_servers_unofficial_mirror_id,
        title: params.title,
        value: typeof params.value === 'string' ? JSON.parse(params.value) : params.value,
        description: params.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async updateMcpJson(id, params) {
      return {
        id,
        mcp_servers_unofficial_mirror_id: params.mcp_servers_unofficial_mirror_id || 1,
        title: params.title || 'Test MCP JSON',
        value: params.value
          ? typeof params.value === 'string'
            ? JSON.parse(params.value)
            : params.value
          : {},
        description: params.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    async deleteMcpJson() {
      return { success: true, message: 'MCP JSON deleted' };
    },
  };
}
