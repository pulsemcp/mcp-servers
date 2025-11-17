import type { IPulseMCPAdminClient } from '../server.js';
import type {
  Post,
  ImageUploadResponse,
  Author,
  MCPServer,
  MCPClient,
  MCPImplementation,
  MCPImplementationsResponse,
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
  };
}
