import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { getNewsletterPosts } from '../../shared/src/tools/get-newsletter-posts.js';
import { getNewsletterPost } from '../../shared/src/tools/get-newsletter-post.js';
import { draftNewsletterPost } from '../../shared/src/tools/draft-newsletter-post.js';
import { updateNewsletterPost } from '../../shared/src/tools/update-newsletter-post.js';
import { uploadImage } from '../../shared/src/tools/upload-image.js';
import { getAuthors } from '../../shared/src/tools/get-authors.js';
import { searchMCPImplementations } from '../../shared/src/tools/search-mcp-implementations.js';
import { getDraftMCPImplementations } from '../../shared/src/tools/get-draft-mcp-implementations.js';
import { saveMCPImplementation } from '../../shared/src/tools/save-mcp-implementation.js';
import { getOfficialMirrorQueueItems } from '../../shared/src/tools/get-official-mirror-queue-items.js';
import { getOfficialMirrorQueueItem } from '../../shared/src/tools/get-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItem } from '../../shared/src/tools/approve-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItemWithoutModifying } from '../../shared/src/tools/approve-official-mirror-queue-item-without-modifying.js';
import { rejectOfficialMirrorQueueItem } from '../../shared/src/tools/reject-official-mirror-queue-item.js';
import { addOfficialMirrorToRegularQueue } from '../../shared/src/tools/add-official-mirror-to-regular-queue.js';
import { unlinkOfficialMirrorQueueItem } from '../../shared/src/tools/unlink-official-mirror-queue-item.js';
import { parseEnabledToolGroups, createRegisterTools } from '../../shared/src/tools.js';
import type {
  IPulseMCPAdminClient,
  Post,
  PostsResponse,
  Author,
  AuthorsResponse,
  MCPImplementation,
  MCPImplementationsResponse,
} from '../../shared/src/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock fs module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Helper function to create a mock client with all required methods stubbed
function createMockClient(overrides?: Partial<IPulseMCPAdminClient>): IPulseMCPAdminClient {
  return {
    getPosts: vi.fn(),
    getPost: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    uploadImage: vi.fn(),
    getAuthors: vi.fn(),
    getAuthorBySlug: vi.fn(),
    getAuthorById: vi.fn(),
    getMCPServerBySlug: vi.fn(),
    getMCPServerById: vi.fn(),
    getMCPClientBySlug: vi.fn(),
    getMCPClientById: vi.fn(),
    getMCPImplementationById: vi.fn(),
    searchMCPImplementations: vi.fn(),
    getDraftMCPImplementations: vi.fn(),
    saveMCPImplementation: vi.fn(),
    createMCPImplementation: vi.fn(),
    sendEmail: vi.fn(),
    searchProviders: vi.fn(),
    getProviderById: vi.fn(),
    // Official mirror queue methods
    getOfficialMirrorQueueItems: vi.fn(),
    getOfficialMirrorQueueItem: vi.fn(),
    approveOfficialMirrorQueueItem: vi.fn(),
    approveOfficialMirrorQueueItemWithoutModifying: vi.fn(),
    rejectOfficialMirrorQueueItem: vi.fn(),
    addOfficialMirrorToRegularQueue: vi.fn(),
    unlinkOfficialMirrorQueueItem: vi.fn(),
    // Unofficial mirror methods
    getUnofficialMirrors: vi.fn(),
    getUnofficialMirror: vi.fn(),
    createUnofficialMirror: vi.fn(),
    updateUnofficialMirror: vi.fn(),
    deleteUnofficialMirror: vi.fn(),
    // Official mirror REST methods
    getOfficialMirrors: vi.fn(),
    getOfficialMirror: vi.fn(),
    // Tenant methods
    getTenants: vi.fn(),
    getTenant: vi.fn(),
    // MCP JSON methods
    getMcpJsons: vi.fn(),
    getMcpJson: vi.fn(),
    createMcpJson: vi.fn(),
    updateMcpJson: vi.fn(),
    deleteMcpJson: vi.fn(),
    // Unified MCP Server methods
    getUnifiedMCPServers: vi.fn(),
    getUnifiedMCPServer: vi.fn(),
    updateUnifiedMCPServer: vi.fn(),
    // Redirect methods
    getRedirects: vi.fn(),
    getRedirect: vi.fn(),
    createRedirect: vi.fn(),
    updateRedirect: vi.fn(),
    deleteRedirect: vi.fn(),
    // GoodJob methods
    getGoodJobs: vi.fn(),
    getGoodJob: vi.fn(),
    getGoodJobCronSchedules: vi.fn(),
    getGoodJobProcesses: vi.fn(),
    getGoodJobStatistics: vi.fn(),
    retryGoodJob: vi.fn(),
    discardGoodJob: vi.fn(),
    rescheduleGoodJob: vi.fn(),
    forceTriggerGoodJobCron: vi.fn(),
    cleanupGoodJobs: vi.fn(),
    // Proctor methods
    runExamForMirror: vi.fn(),
    saveResultsForMirror: vi.fn(),
    getProctorRuns: vi.fn(),
    // Discovered URL methods
    getDiscoveredUrls: vi.fn(),
    markDiscoveredUrlProcessed: vi.fn(),
    getDiscoveredUrlStats: vi.fn(),
    ...overrides,
  };
}

describe('Newsletter Tools', () => {
  const mockServer = {} as Server;

  describe('get_newsletter_posts', () => {
    it('should fetch and format newsletter posts', async () => {
      const mockPosts: Post[] = [
        {
          id: 1,
          title: 'First Post',
          body: '<p>Content</p>',
          slug: 'first-post',
          author_id: 1,
          status: 'live',
          category: 'newsletter',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          author: { id: 1, name: 'John Doe' },
          short_description: 'A brief summary',
        },
        {
          id: 2,
          title: 'Second Post',
          body: '<p>More content</p>',
          slug: 'second-post',
          author_id: 2,
          status: 'draft',
          category: 'newsletter',
          created_at: '2024-01-14T00:00:00Z',
          updated_at: '2024-01-14T00:00:00Z',
        },
      ];

      const mockClient = createMockClient({
        getPosts: vi.fn().mockResolvedValue({
          posts: mockPosts.map((p) => ({ ...p, author: undefined })), // Remove author objects
          pagination: {
            current_page: 1,
            total_pages: 2,
            total_count: 10,
          },
        } as PostsResponse),
        getAuthorById: vi.fn().mockImplementation((id: number) => {
          const authors = [
            {
              id: 1,
              slug: 'john-doe',
              name: 'John Doe',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 2,
              slug: 'jane-smith',
              name: 'Jane Smith',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ];
          return Promise.resolve(authors.find((a) => a.id === id) || null);
        }),
      });

      const tool = getNewsletterPosts(mockServer, () => mockClient);
      const result = await tool.handler({ search: 'test', page: 1 });

      expect(mockClient.getPosts).toHaveBeenCalledWith({ search: 'test', page: 1 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 newsletter posts (page 1 of 2)');
      expect(result.content[0].text).toContain('First Post');
      expect(result.content[0].text).toContain('John Doe (john-doe, ID: 1)'); // Now includes slug and ID
      expect(result.content[0].text).toContain('A brief summary');
    });

    it('should handle errors gracefully', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
      };

      const tool = getNewsletterPosts(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching newsletter posts: Invalid API key');
    });
  });

  describe('get_newsletter_post', () => {
    it('should fetch and format a single post', async () => {
      const mockPost: Post = {
        id: 1,
        title: 'Test Post',
        body: '<p>This is the content</p>',
        slug: 'test-post',
        author_id: 1,
        status: 'live',
        category: 'newsletter',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-16T00:00:00Z',
        short_description: 'Test summary',
        image_url: 'https://example.com/image.jpg',
        featured_mcp_server_ids: [1, 2, 3],
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn().mockResolvedValue(mockPost),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn().mockResolvedValue({
          id: 1,
          slug: 'jane-smith',
          name: 'Jane Smith',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn().mockImplementation((id: number) => {
          const servers = [
            { id: 1, slug: 'server-one', name: 'Server One' },
            { id: 2, slug: 'server-two', name: 'Server Two' },
            { id: 3, slug: 'server-three', name: 'Server Three' },
          ];
          return Promise.resolve(servers.find((s) => s.id === id) || null);
        }),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
      };

      const tool = getNewsletterPost(mockServer, () => mockClient);
      const result = await tool.handler({ slug: 'test-post' });

      expect(mockClient.getPost).toHaveBeenCalledWith('test-post');
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('# Test Post');
      expect(text).toContain('Jane Smith (jane-smith, ID: 1)'); // Now includes slug and ID
      expect(text).toContain('This is the content');
      expect(text).toContain('- **Image URL:** https://example.com/image.jpg');
      expect(text).toContain(
        '- **Featured MCP Servers:** server-one (ID: 1), server-two (ID: 2), server-three (ID: 3)'
      ); // Now shows slugs and IDs
    });
  });

  describe('draft_newsletter_post', () => {
    it('should create a draft post', async () => {
      const mockPost: Post = {
        id: 100,
        title: 'New Draft',
        body: '<p>Draft content</p>',
        slug: 'new-draft',
        author_id: 1,
        status: 'draft',
        category: 'newsletter',
        created_at: '2024-01-17T00:00:00Z',
        updated_at: '2024-01-17T00:00:00Z',
        author: { id: 1, name: 'Author Name' },
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn().mockResolvedValue(mockPost),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn().mockResolvedValue({
          id: 1,
          name: 'Author Name',
          slug: 'author-name',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
      };

      const tool = draftNewsletterPost(mockServer, () => mockClient);
      const result = await tool.handler({
        title: 'New Draft',
        body: '<p>Draft content</p>',
        slug: 'new-draft',
        author_slug: 'author-name',
      });

      expect(mockClient.getAuthorBySlug).toHaveBeenCalledWith('author-name');
      expect(mockClient.createPost).toHaveBeenCalledWith({
        title: 'New Draft',
        body: '<p>Draft content</p>',
        slug: 'new-draft',
        author_id: 1,
        status: 'draft',
        category: 'newsletter',
      });
      expect(result.content[0].text).toContain('Successfully created draft newsletter post!');
      expect(result.content[0].text).toContain('New Draft');
      expect(result.content[0].text).toContain('**Status:** draft');
    });
  });

  describe('update_newsletter_post', () => {
    it('should update an existing post', async () => {
      const mockPost: Post = {
        id: 1,
        title: 'Updated Title',
        body: '<p>Updated content</p>',
        slug: 'test-post',
        author_id: 1,
        status: 'live',
        category: 'newsletter',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-17T00:00:00Z',
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn().mockResolvedValue(mockPost),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi
          .fn()
          .mockResolvedValue({ id: 2, name: 'Test Server', slug: 'test-server' }),
        getMCPClientBySlug: vi
          .fn()
          .mockResolvedValue({ id: 3, name: 'Test Client', slug: 'test-client' }),
      };

      const tool = updateNewsletterPost(mockServer, () => mockClient);
      const result = await tool.handler({
        slug: 'test-post',
        title: 'Updated Title',
        featured_mcp_server_slugs: ['test-server'],
        featured_mcp_client_slugs: ['test-client'],
      });

      expect(mockClient.getMCPServerBySlug).toHaveBeenCalledWith('test-server');
      expect(mockClient.getMCPClientBySlug).toHaveBeenCalledWith('test-client');
      expect(mockClient.updatePost).toHaveBeenCalledWith('test-post', {
        title: 'Updated Title',
        featured_mcp_server_ids: [2],
        featured_mcp_client_ids: [3],
      });
      expect(result.content[0].text).toContain('Successfully updated newsletter post!');
      expect(result.content[0].text).toContain('Fields updated:');
      expect(result.content[0].text).toContain('- title');
      expect(result.content[0].text).toContain('- featured_mcp_servers (converted from slugs)');
      expect(result.content[0].text).toContain('- featured_mcp_clients (converted from slugs)');
    });

    it('should handle no updates provided', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
      };

      const tool = updateNewsletterPost(mockServer, () => mockClient);
      const result = await tool.handler({ slug: 'test-post' });

      expect(mockClient.updatePost).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('No changes provided');
    });
  });

  describe('upload_image', () => {
    it('should upload an image file', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake image data'));

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn().mockResolvedValue({
          url: 'https://storage.pulsemcp.com/images/newsletter/test-post/image.png',
        }),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
      };

      const tool = uploadImage(mockServer, () => mockClient);
      const result = await tool.handler({
        post_slug: 'test-post',
        file_name: 'image.png',
        file_path: '/path/to/image.png',
      });

      expect(fs.readFile).toHaveBeenCalledWith('/path/to/image.png');
      expect(mockClient.uploadImage).toHaveBeenCalledWith(
        'test-post',
        'image.png',
        Buffer.from('fake image data')
      );
      expect(result.content[0].text).toContain('Successfully uploaded image!');
      expect(result.content[0].text).toContain(
        'https://storage.pulsemcp.com/images/newsletter/test-post/image.png'
      );
    });

    it('should handle file read errors', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
      };

      const tool = uploadImage(mockServer, () => mockClient);
      const result = await tool.handler({
        post_slug: 'test-post',
        file_name: 'image.png',
        file_path: '/invalid/path.png',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to read file');
    });
  });

  describe('get_authors', () => {
    it('should fetch and format authors', async () => {
      const mockAuthors: Author[] = [
        {
          id: 1,
          name: 'John Doe',
          slug: 'john-doe',
          bio: 'A prolific writer',
          avatar_url: 'https://example.com/avatar1.jpg',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 2,
          name: 'Jane Smith',
          slug: 'jane-smith',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
        },
      ];

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn().mockResolvedValue({
          authors: mockAuthors,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 2,
          },
        } as AuthorsResponse),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
      };

      const tool = getAuthors(mockServer, () => mockClient);
      const result = await tool.handler({ search: 'John', page: 1 });

      expect(mockClient.getAuthors).toHaveBeenCalledWith({ search: 'John', page: 1 });
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 authors (page 1 of 1)');
      expect(result.content[0].text).toContain('John Doe');
      expect(result.content[0].text).toContain('**Slug:** john-doe (ID: 1)');
      expect(result.content[0].text).toContain('A prolific writer');
      expect(result.content[0].text).toContain('Jane Smith');
    });

    it('should handle errors gracefully', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn().mockRejectedValue(new Error('API Error')),
        getAuthorBySlug: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        searchMCPImplementations: vi.fn(),
      };

      const tool = getAuthors(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching authors: API Error');
    });
  });

  describe('search_mcp_implementations', () => {
    it('should search for MCP implementations', async () => {
      const mockImplementations: MCPImplementation[] = [
        {
          id: 1,
          name: 'Filesystem Server',
          slug: 'filesystem',
          type: 'server',
          status: 'live',
          short_description: 'Provides access to filesystem operations',
          classification: 'official',
          implementation_language: 'TypeScript',
          github_stars: 150,
          provider_name: 'Anthropic',
          url: 'https://github.com/anthropics/mcp-filesystem',
          mcp_server_id: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 2,
          name: 'Database Server',
          slug: 'database',
          type: 'server',
          status: 'live',
          short_description: 'Provides database access',
          classification: 'community',
          implementation_language: 'Python',
          github_stars: 80,
          provider_name: 'Community',
          mcp_server_id: 11,
        },
      ];

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn().mockResolvedValue({
          implementations: mockImplementations,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 2,
          },
        } as MCPImplementationsResponse),
      };

      const tool = searchMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'filesystem' });

      expect(mockClient.searchMCPImplementations).toHaveBeenCalledWith({
        query: 'filesystem',
        type: 'all',
        status: 'live',
        limit: undefined,
        offset: undefined,
      });
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('Found 2 MCP implementation(s) matching "filesystem"');
      expect(text).toContain('Filesystem Server');
      expect(text).toContain('ID: 1');
      expect(text).toContain('Slug: filesystem');
      expect(text).toContain('Status: live');
      expect(text).toContain('Classification: official');
      expect(text).toContain('Provider: Anthropic');
      expect(text).toContain('Language: TypeScript');
      expect(text).toContain('GitHub Stars: 150');
      expect(text).toContain('Provides access to filesystem operations');
      expect(text).toContain('Database Server');
    });

    it('should support filtering by type and status', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [],
          pagination: { current_page: 1, total_pages: 1, total_count: 0 },
        } as MCPImplementationsResponse),
      };

      const tool = searchMCPImplementations(mockServer, () => mockClient);
      await tool.handler({
        query: 'test',
        type: 'server',
        status: 'draft',
        limit: 10,
        offset: 20,
      });

      expect(mockClient.searchMCPImplementations).toHaveBeenCalledWith({
        query: 'test',
        type: 'server',
        status: 'draft',
        limit: 10,
        offset: 20,
      });
    });

    it('should handle pagination information', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [
            {
              id: 1,
              name: 'Test Server',
              slug: 'test',
              type: 'server',
              status: 'live',
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 3,
            total_count: 50,
            has_next: true,
            limit: 30,
          },
        } as MCPImplementationsResponse),
      };

      const tool = searchMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'test', limit: 30, offset: 0 });

      expect(result.content[0].text).toContain('showing 1 of 50 total');
      expect(result.content[0].text).toContain(
        'More results available. Use offset=30 to see the next page'
      );
    });

    it('should handle errors gracefully', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn().mockRejectedValue(new Error('API Error')),
      };

      const tool = searchMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error searching MCP implementations: API Error');
    });
  });

  describe('parseEnabledToolGroups', () => {
    it('should parse valid tool groups from parameter', () => {
      const groups = parseEnabledToolGroups('newsletter,server_directory,official_queue');
      expect(groups).toEqual(['newsletter', 'server_directory', 'official_queue']);
    });

    it('should parse single group', () => {
      const groups = parseEnabledToolGroups('newsletter');
      expect(groups).toEqual(['newsletter']);
    });

    it('should parse readonly variants', () => {
      const groups = parseEnabledToolGroups('newsletter_readonly,server_directory_readonly');
      expect(groups).toEqual(['newsletter_readonly', 'server_directory_readonly']);
    });

    it('should handle whitespace in group names', () => {
      const groups = parseEnabledToolGroups('newsletter , server_directory , official_queue ');
      expect(groups).toEqual(['newsletter', 'server_directory', 'official_queue']);
    });

    it('should filter out invalid group names', () => {
      const groups = parseEnabledToolGroups('newsletter,invalid_group,server_directory');
      expect(groups).toEqual(['newsletter', 'server_directory']);
    });

    it('should accept proctor_readonly as a valid tool group', () => {
      const groups = parseEnabledToolGroups('newsletter,proctor_readonly,proctor');
      expect(groups).toEqual(['newsletter', 'proctor_readonly', 'proctor']);
    });

    it('should return all base groups when empty string provided', () => {
      const groups = parseEnabledToolGroups('');
      expect(groups).toEqual([
        'newsletter',
        'server_directory',
        'official_queue',
        'unofficial_mirrors',
        'official_mirrors',
        'tenants',
        'mcp_jsons',
        'mcp_servers',
        'redirects',
        'good_jobs',
        'proctor',
        'discovered_urls',
        'notifications',
      ]);
    });

    it('should return all base groups when no parameter provided', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toEqual([
        'newsletter',
        'server_directory',
        'official_queue',
        'unofficial_mirrors',
        'official_mirrors',
        'tenants',
        'mcp_jsons',
        'mcp_servers',
        'redirects',
        'good_jobs',
        'proctor',
        'discovered_urls',
        'notifications',
      ]);
    });

    it('should prioritize parameter over environment variable', () => {
      const originalEnv = process.env.TOOL_GROUPS;
      process.env.TOOL_GROUPS = 'server_directory';

      const groups = parseEnabledToolGroups('newsletter');
      expect(groups).toEqual(['newsletter']);

      // Restore original env
      if (originalEnv) {
        process.env.TOOL_GROUPS = originalEnv;
      } else {
        delete process.env.TOOL_GROUPS;
      }
    });

    it('should deduplicate groups', () => {
      const groups = parseEnabledToolGroups('newsletter,newsletter,server_directory');
      expect(groups).toEqual(['newsletter', 'server_directory']);
    });

    it('should allow mixing base and readonly groups', () => {
      const groups = parseEnabledToolGroups('newsletter,server_directory_readonly,official_queue');
      expect(groups).toEqual(['newsletter', 'server_directory_readonly', 'official_queue']);
    });
  });

  describe('createRegisterTools with toolgroups filtering', () => {
    const createMockClient2 = (): IPulseMCPAdminClient => createMockClient();

    it('should register only newsletter tools when newsletter group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(clientFactory, 'newsletter');
      registerTools(mockServer);

      // Mock the ListToolsRequestSchema handler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      expect(listToolsHandler).toBeDefined();

      const result = await listToolsHandler({ method: 'tools/list', params: {} });
      expect(result.tools).toHaveLength(6);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');
      expect(toolNames).not.toContain('search_mcp_implementations');
      expect(toolNames).not.toContain('get_draft_mcp_implementations');
      expect(toolNames).not.toContain('save_mcp_implementation');
    });

    it('should register only server_directory tools when server_directory group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(clientFactory, 'server_directory');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // server_directory is a superset: 4 original + 7 official_queue + 5 unofficial_mirrors + 2 official_mirrors + 5 mcp_jsons + 3 mcp_servers = 26 tools
      // (send_impl_posted_notif moved to separate 'notifications' group)
      expect(result.tools).toHaveLength(26);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('find_providers');
      // Also includes tools from overlapping groups
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_unofficial_mirrors');
      expect(toolNames).toContain('get_official_mirrors');
      expect(toolNames).toContain('get_mcp_jsons');
      expect(toolNames).toContain('list_mcp_servers');
      expect(toolNames).not.toContain('get_newsletter_posts');
    });

    it('should register all tools when all groups are enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(
        clientFactory,
        'newsletter,server_directory,official_queue'
      );
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // 6 newsletter + 26 server_directory (superset, already includes official_queue tools) = 32
      // (send_impl_posted_notif moved to separate 'notifications' group)
      expect(result.tools).toHaveLength(32);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('find_providers');
      expect(toolNames).toContain('get_official_mirror_queue_items');
    });

    it('should register all tools when no groups specified (default)', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(clientFactory);
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // 6 newsletter + 4 server_directory + 7 official_queue + 5 unofficial_mirrors + 2 official_mirrors + 2 tenants + 5 mcp_jsons + 3 mcp_servers + 5 redirects + 10 good_jobs + 4 proctor + 3 discovered_urls + 1 notifications = 57 tools
      expect(result.tools).toHaveLength(57);
    });

    it('should register only read-only newsletter tools when newsletter_readonly group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(clientFactory, 'newsletter_readonly');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(3); // Only read-only newsletter tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('get_authors');
      // Write tools should NOT be present
      expect(toolNames).not.toContain('draft_newsletter_post');
      expect(toolNames).not.toContain('update_newsletter_post');
      expect(toolNames).not.toContain('upload_image');
    });

    it('should register only get_exam_result when proctor_readonly group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(clientFactory, 'proctor_readonly');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(2); // Read-only proctor tools: get_exam_result + list_proctor_runs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_exam_result');
      expect(toolNames).toContain('list_proctor_runs');
      // Write tools should NOT be present
      expect(toolNames).not.toContain('run_exam_for_mirror');
      expect(toolNames).not.toContain('save_results_for_mirror');
    });

    it('should register only read-only tools when all _readonly groups are enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      const registerTools = createRegisterTools(
        clientFactory,
        'newsletter_readonly,server_directory_readonly,official_queue_readonly'
      );
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // 3 newsletter read + 13 server_directory read (superset, already includes official_queue read) = 16 tools
      expect(result.tools).toHaveLength(16);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      // Read-only tools should be present
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_official_mirror_queue_items');
      // Tools from overlapping groups also available via server_directory_readonly
      expect(toolNames).toContain('get_unofficial_mirrors');
      expect(toolNames).toContain('get_official_mirrors');
      expect(toolNames).toContain('get_mcp_jsons');
      expect(toolNames).toContain('list_mcp_servers');
      // Write tools should NOT be present
      expect(toolNames).not.toContain('draft_newsletter_post');
      expect(toolNames).not.toContain('save_mcp_implementation');
      expect(toolNames).not.toContain('approve_official_mirror_queue_item');
    });

    it('should allow mixing base and readonly groups for different access levels', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient2();

      // Full access to newsletter, read-only to server_directory
      const registerTools = createRegisterTools(
        clientFactory,
        'newsletter,server_directory_readonly'
      );
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // 6 newsletter (all) + 13 server_directory read (superset) = 19 tools
      expect(result.tools).toHaveLength(19);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      // Newsletter write tools should be present
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      // Server queue read tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      // Server queue write tools should NOT be present
      expect(toolNames).not.toContain('save_mcp_implementation');
    });
  });

  describe('get_draft_mcp_implementations', () => {
    it('should fetch and format draft implementations', async () => {
      const mockDraftImplementations = [
        {
          id: 100,
          name: 'GitHub MCP Server',
          slug: 'github-mcp-server',
          type: 'server' as const,
          status: 'draft' as const,
          short_description: 'Access GitHub repositories',
          classification: 'official' as const,
          implementation_language: 'TypeScript',
          provider_name: 'Anthropic',
          url: 'https://github.com/anthropics/mcp-github',
          github_stars: 500,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
        {
          id: 101,
          name: 'Database Client',
          slug: 'database-client',
          type: 'client' as const,
          status: 'draft' as const,
          short_description: 'Query databases',
          classification: 'community' as const,
          implementation_language: 'Python',
          provider_name: 'Community',
          created_at: '2024-01-12T00:00:00Z',
          updated_at: '2024-01-14T00:00:00Z',
        },
      ];

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockResolvedValue({
          implementations: mockDraftImplementations,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 2,
          },
        }),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({ page: 1 });

      expect(mockClient.getDraftMCPImplementations).toHaveBeenCalledWith({ page: 1 });
      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('Found 2 draft MCP implementations');
      expect(text).toContain('page 1 of 1, total: 2');
      expect(text).toContain('GitHub MCP Server');
      expect(text).toContain('github-mcp-server');
      expect(text).toContain('Type: server');
      expect(text).toContain('Status: draft');
      expect(text).toContain('Access GitHub repositories');
      expect(text).toContain('Classification: official');
      expect(text).toContain('Language: TypeScript');
      expect(text).toContain('Provider: Anthropic');
      expect(text).toContain('GitHub Stars: 500');
      expect(text).toContain('Database Client');
    });

    it('should handle empty results', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [],
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 0,
          },
        }),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Found 0 draft MCP implementations');
    });

    it('should support search filtering', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [
            {
              id: 100,
              name: 'GitHub MCP Server',
              slug: 'github-mcp-server',
              type: 'server' as const,
              status: 'draft' as const,
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 1,
          },
        }),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      await tool.handler({ search: 'github', page: 1 });

      expect(mockClient.getDraftMCPImplementations).toHaveBeenCalledWith({
        search: 'github',
        page: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [
            {
              id: 100,
              name: 'Implementation 1',
              slug: 'impl-1',
              type: 'server' as const,
              status: 'draft' as const,
            },
          ],
          pagination: {
            current_page: 2,
            total_pages: 5,
            total_count: 100,
          },
        }),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({ page: 2 });

      expect(result.content[0].text).toContain('page 2 of 5, total: 100');
    });

    it('should include linked server/client IDs when present', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockResolvedValue({
          implementations: [
            {
              id: 100,
              name: 'Linked Implementation',
              slug: 'linked-impl',
              type: 'server' as const,
              status: 'draft' as const,
              mcp_server_id: 42,
              mcp_client_id: 55,
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 1,
          },
        }),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Linked MCP Server ID: 42');
      expect(result.content[0].text).toContain('Linked MCP Client ID: 55');
    });

    it('should handle errors gracefully', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        getDraftMCPImplementations: vi.fn().mockRejectedValue(new Error('Invalid API key')),
      };

      const tool = getDraftMCPImplementations(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error fetching draft MCP implementations: Invalid API key'
      );
    });
  });

  describe('save_mcp_implementation', () => {
    it('should save and update MCP implementation with multiple fields', async () => {
      const mockUpdatedImplementation = {
        id: 100,
        name: 'Updated GitHub MCP Server',
        slug: 'github-mcp-server',
        type: 'server' as const,
        status: 'live' as const,
        short_description: 'Updated description',
        classification: 'official' as const,
        implementation_language: 'TypeScript',
        provider_name: 'Anthropic',
        url: 'https://github.com/anthropics/mcp-github',
        github_stars: 600,
        updated_at: '2024-01-20T16:30:00Z',
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn().mockResolvedValue(mockUpdatedImplementation),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 100,
        name: 'Updated GitHub MCP Server',
        status: 'live',
        short_description: 'Updated description',
        github_stars: 600,
      });

      expect(mockClient.saveMCPImplementation).toHaveBeenCalledWith(100, {
        name: 'Updated GitHub MCP Server',
        status: 'live',
        short_description: 'Updated description',
        github_stars: 600,
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated MCP implementation!');
      expect(text).toContain('Updated GitHub MCP Server');
      expect(text).toContain('100');
      expect(text).toContain('github-mcp-server');
      expect(text).toContain('server');
      expect(text).toContain('live');
      expect(text).toContain('official');
      expect(text).toContain('TypeScript');
      expect(text).toContain('Anthropic');
      expect(text).toContain('600');
      expect(text).toContain('Fields updated:');
      expect(text).toContain('- name');
      expect(text).toContain('- status');
      expect(text).toContain('- short_description');
      expect(text).toContain('- github_stars');
    });

    it('should include canonical URLs and remotes in update response', async () => {
      const mockUpdatedImplementation = {
        id: 100,
        name: 'Test Server',
        slug: 'test-server',
        type: 'server' as const,
        status: 'live' as const,
        updated_at: '2024-01-20T16:30:00Z',
        canonical: [
          { url: 'https://github.com/org/repo', scope: 'url' as const },
          { url: 'https://example.com', scope: 'domain' as const, note: 'main site' },
        ],
        mcp_server: {
          id: 50,
          slug: 'test-server',
          remotes: [
            {
              id: 1,
              display_name: 'Smithery',
              url_direct: 'https://smithery.ai/server/test',
              transport: 'sse',
            },
            { id: 2, url_direct: 'https://api.example.com/mcp' },
          ],
        },
      };

      const mockClient = createMockClient({
        saveMCPImplementation: vi.fn().mockResolvedValue(mockUpdatedImplementation),
      });

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 100,
        canonical: [
          { url: 'https://github.com/org/repo', scope: 'url' },
          { url: 'https://example.com', scope: 'domain', note: 'main site' },
        ],
        remote: [
          {
            url_direct: 'https://smithery.ai/server/test',
            transport: 'sse',
            display_name: 'Smithery',
          },
          { url_direct: 'https://api.example.com/mcp' },
        ],
      });

      const text = result.content[0].text;
      expect(text).toContain('Canonical URLs:** 2');
      expect(text).toContain('https://github.com/org/repo (url)');
      expect(text).toContain('https://example.com (domain)');
      expect(text).toContain('Remote Endpoints:** 2');
      expect(text).toContain('Smithery');
      expect(text).toContain('https://api.example.com/mcp');
    });

    it('should include canonical URLs and remotes in create response', async () => {
      const mockCreatedImplementation = {
        id: 200,
        name: 'New Server',
        slug: 'new-server',
        type: 'server' as const,
        status: 'draft' as const,
        created_at: '2024-01-20T16:30:00Z',
        canonical: [{ url: 'https://github.com/org/new-server', scope: 'url' as const }],
        mcp_server: {
          id: 60,
          slug: 'new-server',
          remotes: [
            {
              id: 1,
              display_name: 'Main Remote',
              url_direct: 'https://api.example.com/mcp',
              transport: 'sse',
            },
          ],
        },
      };

      const mockClient = createMockClient({
        createMCPImplementation: vi.fn().mockResolvedValue(mockCreatedImplementation),
      });

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({
        name: 'New Server',
        type: 'server',
        canonical: [{ url: 'https://github.com/org/new-server', scope: 'url' }],
        remote: [
          {
            url_direct: 'https://api.example.com/mcp',
            transport: 'sse',
            display_name: 'Main Remote',
          },
        ],
      });

      const text = result.content[0].text;
      expect(text).toContain('Successfully created new MCP implementation!');
      expect(text).toContain('Canonical URLs:** 1');
      expect(text).toContain('https://github.com/org/new-server (url)');
      expect(text).toContain('Remote Endpoints:** 1');
      expect(text).toContain('Main Remote');
      expect(text).toContain('get_mcp_server');
      expect(text).toContain('new-server');
    });

    it('should require name and type when creating (no id)', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn(),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);

      // Test with missing type - should return error
      const resultMissingType = await tool.handler({ name: 'Test' } as unknown);
      expect(resultMissingType.isError).toBe(true);
      expect(resultMissingType.content[0].text).toContain('type');
      expect(resultMissingType.content[0].text).toContain('required');

      // Test with missing name - should return error
      const resultMissingName = await tool.handler({ type: 'server' } as unknown);
      expect(resultMissingName.isError).toBe(true);
      expect(resultMissingName.content[0].text).toContain('name');
      expect(resultMissingName.content[0].text).toContain('required');
    });

    it('should handle no updates provided', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn(),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100 });

      expect(mockClient.saveMCPImplementation).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('No changes provided');
    });

    it('should handle partial updates', async () => {
      const mockUpdatedImplementation = {
        id: 100,
        name: 'Original Name',
        slug: 'original-slug',
        type: 'server' as const,
        status: 'live' as const, // Only this changed
        short_description: 'Original description',
        updated_at: '2024-01-20T16:30:00Z',
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn().mockResolvedValue(mockUpdatedImplementation),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100, status: 'live' });

      expect(mockClient.saveMCPImplementation).toHaveBeenCalledWith(100, { status: 'live' });
      expect(result.content[0].text).toContain('Successfully updated MCP implementation!');
      expect(result.content[0].text).toContain('- status');
    });

    it('should handle validation errors (422)', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi
          .fn()
          .mockRejectedValue(new Error('Validation failed: slug must be unique, name is required')),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100, name: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error saving MCP implementation: Validation failed'
      );
    });

    it('should handle not found errors (404)', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi
          .fn()
          .mockRejectedValue(new Error('MCP implementation not found: 99999')),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 99999, name: 'Updated' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('MCP implementation not found');
    });

    it('should support unlinking associations with null values', async () => {
      const mockUpdatedImplementation = {
        id: 100,
        name: 'Unlinked Implementation',
        slug: 'unlinked-impl',
        type: 'server' as const,
        status: 'draft' as const,
        mcp_server_id: null,
        mcp_client_id: null,
        updated_at: '2024-01-20T16:30:00Z',
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn().mockResolvedValue(mockUpdatedImplementation),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 100,
        mcp_server_id: null,
        mcp_client_id: null,
      });

      expect(mockClient.saveMCPImplementation).toHaveBeenCalledWith(100, {
        mcp_server_id: null,
        mcp_client_id: null,
      });

      expect(result.content[0].text).toContain('Successfully updated MCP implementation!');
      expect(result.content[0].text).toContain('- mcp_server_id');
      expect(result.content[0].text).toContain('- mcp_client_id');
    });

    it('should support updating all field types (enums and strings)', async () => {
      const mockUpdatedImplementation = {
        id: 100,
        name: 'TypeScript Database',
        slug: 'ts-database',
        type: 'client' as const,
        status: 'archived' as const,
        classification: 'community' as const,
        implementation_language: 'TypeScript',
        provider_name: 'Community Team',
        url: 'https://example.com/ts-db',
        github_stars: 250,
        short_description: 'TypeScript database client',
        description: 'Full TypeScript database client implementation',
        updated_at: '2024-01-20T16:30:00Z',
      };

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn().mockResolvedValue(mockUpdatedImplementation),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 100,
        name: 'TypeScript Database',
        type: 'client',
        status: 'archived',
        classification: 'community',
        implementation_language: 'TypeScript',
        provider_name: 'Community Team',
        url: 'https://example.com/ts-db',
        github_stars: 250,
        short_description: 'TypeScript database client',
        description: 'Full TypeScript database client implementation',
        slug: 'ts-database',
      });

      expect(mockClient.saveMCPImplementation).toHaveBeenCalledWith(100, {
        name: 'TypeScript Database',
        type: 'client',
        status: 'archived',
        classification: 'community',
        implementation_language: 'TypeScript',
        provider_name: 'Community Team',
        url: 'https://example.com/ts-db',
        github_stars: 250,
        short_description: 'TypeScript database client',
        description: 'Full TypeScript database client implementation',
        slug: 'ts-database',
      });

      expect(result.content[0].text).toContain('Successfully updated MCP implementation!');
      expect(result.content[0].text).toContain('client');
      expect(result.content[0].text).toContain('archived');
      expect(result.content[0].text).toContain('community');
    });

    it('should handle API errors gracefully', async () => {
      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn(),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
        getAuthorById: vi.fn(),
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
        saveMCPImplementation: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        createMCPImplementation: vi.fn(),
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100, name: 'Updated' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error saving MCP implementation: Invalid API key');
    });
  });

  describe('Official Mirror Queue Tools', () => {
    const mockServer = {} as Server;

    describe('get_official_mirror_queue_items', () => {
      it('should fetch and format official mirror queue items', async () => {
        const mockClient = createMockClient({
          getOfficialMirrorQueueItems: vi.fn().mockResolvedValue({
            items: [
              {
                id: 1,
                name: 'com.example/test-server',
                status: 'pending_new',
                mirrors_count: 2,
                linked_server_slug: null,
                linked_server_id: null,
                latest_mirror: {
                  id: 1,
                  name: 'com.example/test-server',
                  version: '1.0.0',
                  description: 'A test MCP server',
                  github_url: 'https://github.com/example/test-server',
                  website_url: 'https://example.com',
                  published_at: '2024-01-15T00:00:00Z',
                },
                created_at: '2024-01-15T00:00:00Z',
                updated_at: '2024-01-15T00:00:00Z',
              },
            ],
            pagination: {
              current_page: 1,
              total_pages: 1,
              total_count: 1,
              has_next: false,
              limit: 30,
            },
          }),
        });

        const tool = getOfficialMirrorQueueItems(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(mockClient.getOfficialMirrorQueueItems).toHaveBeenCalledWith({});
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found 1 official mirror queue items');
        expect(result.content[0].text).toContain('com.example/test-server');
        expect(result.content[0].text).toContain('pending_new');
        expect(result.content[0].text).toContain('Mirrors: 2');
        expect(result.content[0].text).toContain('1.0.0');
      });

      it('should support status filtering', async () => {
        const mockClient = createMockClient({
          getOfficialMirrorQueueItems: vi.fn().mockResolvedValue({
            items: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_count: 0,
              has_next: false,
              limit: 30,
            },
          }),
        });

        const tool = getOfficialMirrorQueueItems(mockServer, () => mockClient);
        await tool.handler({ status: 'approved' });

        expect(mockClient.getOfficialMirrorQueueItems).toHaveBeenCalledWith({ status: 'approved' });
      });

      it('should handle errors gracefully', async () => {
        const mockClient = createMockClient({
          getOfficialMirrorQueueItems: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        });

        const tool = getOfficialMirrorQueueItems(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error fetching official mirror queue items');
      });
    });

    describe('get_official_mirror_queue_item', () => {
      it('should fetch and format a single queue item with details', async () => {
        const mockClient = createMockClient({
          getOfficialMirrorQueueItem: vi.fn().mockResolvedValue({
            id: 1,
            name: 'com.example/test-server',
            status: 'pending_new',
            mirrors_count: 1,
            linked_server: null,
            server_linkage_consistent: true,
            mirrors: [
              {
                id: 1,
                name: 'com.example/test-server',
                version: '1.0.0',
                official_version_id: 'test-1',
                description: 'A test server',
                github_url: 'https://github.com/example/test-server',
                website_url: 'https://example.com',
                categories: ['development'],
                license: 'MIT',
                remotes: [],
                packages: [],
                published_at: '2024-01-15T00:00:00Z',
                schema_version: '2025-09-29',
                datetime_ingested: '2024-01-16T00:00:00Z',
                created_at: '2024-01-16T00:00:00Z',
                updated_at: '2024-01-16T00:00:00Z',
              },
            ],
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          }),
        });

        const tool = getOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(mockClient.getOfficialMirrorQueueItem).toHaveBeenCalledWith(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('com.example/test-server');
        expect(result.content[0].text).toContain('pending_new');
        expect(result.content[0].text).toContain('**Server Linkage Consistent:** Yes');
        expect(result.content[0].text).toContain('1.0.0');
        expect(result.content[0].text).toContain('MIT');
      });

      it('should handle not found errors', async () => {
        const mockClient = createMockClient({
          getOfficialMirrorQueueItem: vi
            .fn()
            .mockRejectedValue(new Error('Queue entry not found: 999')),
        });

        const tool = getOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 999 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Queue entry not found');
      });
    });

    describe('approve_official_mirror_queue_item', () => {
      it('should approve and link queue item to server', async () => {
        const mockClient = createMockClient({
          approveOfficialMirrorQueueItem: vi.fn().mockResolvedValue({
            success: true,
            message: 'Approval job enqueued for linking to test-server',
            queue_item: {
              id: 1,
              name: 'com.example/test-server',
              status: 'pending_new',
              mirrors_count: 1,
              linked_server_slug: 'test-server',
              linked_server_id: 42,
              latest_mirror: null,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          }),
        });

        const tool = approveOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1, mcp_server_slug: 'test-server' });

        expect(mockClient.approveOfficialMirrorQueueItem).toHaveBeenCalledWith(1, 'test-server');
        expect(result.content[0].text).toContain('Approval Job Enqueued');
        expect(result.content[0].text).toContain('test-server');
        expect(result.content[0].text).toContain('async operation');
      });

      it('should handle server not found errors', async () => {
        const mockClient = createMockClient({
          approveOfficialMirrorQueueItem: vi
            .fn()
            .mockRejectedValue(new Error('MCP Server not found')),
        });

        const tool = approveOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1, mcp_server_slug: 'nonexistent' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('MCP Server not found');
      });
    });

    describe('reject_official_mirror_queue_item', () => {
      it('should reject queue item', async () => {
        const mockClient = createMockClient({
          rejectOfficialMirrorQueueItem: vi.fn().mockResolvedValue({
            success: true,
            message: 'Rejection job enqueued',
            queue_item: {
              id: 1,
              name: 'com.example/test-server',
              status: 'pending_new',
              mirrors_count: 1,
              linked_server_slug: null,
              linked_server_id: null,
              latest_mirror: null,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          }),
        });

        const tool = rejectOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(mockClient.rejectOfficialMirrorQueueItem).toHaveBeenCalledWith(1);
        expect(result.content[0].text).toContain('Rejection Job Enqueued');
        expect(result.content[0].text).toContain('async operation');
      });
    });

    describe('approve_mirror_no_modify', () => {
      it('should approve queue item without modifying linked server', async () => {
        const mockClient = createMockClient({
          approveOfficialMirrorQueueItemWithoutModifying: vi.fn().mockResolvedValue({
            success: true,
            message: 'Queue item approved without modifying linked server',
            queue_item: {
              id: 1,
              name: 'com.example/test-server',
              status: 'approved',
              mirrors_count: 1,
              linked_server_slug: 'test-server',
              linked_server_id: 42,
              latest_mirror: null,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          }),
        });

        const tool = approveOfficialMirrorQueueItemWithoutModifying(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(mockClient.approveOfficialMirrorQueueItemWithoutModifying).toHaveBeenCalledWith(1);
        expect(result.content[0].text).toContain('Queue Item Approved');
        expect(result.content[0].text).toContain('approved without modifying');
        expect(result.content[0].text).toContain('test-server');
      });

      it('should handle errors when queue item is not linked', async () => {
        const mockClient = createMockClient({
          approveOfficialMirrorQueueItemWithoutModifying: vi
            .fn()
            .mockRejectedValue(new Error('Queue item must be linked to a server first')),
        });

        const tool = approveOfficialMirrorQueueItemWithoutModifying(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Queue item must be linked to a server first');
      });
    });

    describe('add_official_mirror_to_regular_queue', () => {
      it('should add queue item to regular queue as draft implementation', async () => {
        const mockClient = createMockClient({
          addOfficialMirrorToRegularQueue: vi.fn().mockResolvedValue({
            success: true,
            message: 'Job enqueued to create draft MCP implementation',
            queue_item: {
              id: 1,
              name: 'com.example/test-server',
              status: 'pending_new',
              mirrors_count: 1,
              linked_server_slug: null,
              linked_server_id: null,
              latest_mirror: null,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          }),
        });

        const tool = addOfficialMirrorToRegularQueue(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(mockClient.addOfficialMirrorToRegularQueue).toHaveBeenCalledWith(1);
        expect(result.content[0].text).toContain('Job enqueued');
        expect(result.content[0].text).toContain('draft MCP implementation');
        expect(result.content[0].text).toContain('async operation');
      });

      it('should handle validation errors', async () => {
        const mockClient = createMockClient({
          addOfficialMirrorToRegularQueue: vi
            .fn()
            .mockRejectedValue(new Error('Queue item is already linked to a server')),
        });

        const tool = addOfficialMirrorToRegularQueue(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Queue item is already linked to a server');
      });
    });

    describe('unlink_official_mirror_queue_item', () => {
      it('should unlink queue item from linked server', async () => {
        const mockClient = createMockClient({
          unlinkOfficialMirrorQueueItem: vi.fn().mockResolvedValue({
            success: true,
            message: 'Queue item unlinked from server',
            queue_item: {
              id: 1,
              name: 'com.example/test-server',
              status: 'pending_new',
              mirrors_count: 1,
              linked_server_slug: null,
              linked_server_id: null,
              latest_mirror: null,
              created_at: '2024-01-15T00:00:00Z',
              updated_at: '2024-01-15T00:00:00Z',
            },
          }),
        });

        const tool = unlinkOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(mockClient.unlinkOfficialMirrorQueueItem).toHaveBeenCalledWith(1);
        expect(result.content[0].text).toContain('Queue Item Unlinked');
        expect(result.content[0].text).toContain('successfully unlinked');
      });

      it('should handle errors when queue item is not linked', async () => {
        const mockClient = createMockClient({
          unlinkOfficialMirrorQueueItem: vi
            .fn()
            .mockRejectedValue(new Error('Queue item is not linked to any server')),
        });

        const tool = unlinkOfficialMirrorQueueItem(mockServer, () => mockClient);
        const result = await tool.handler({ id: 1 });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Queue item is not linked to any server');
      });
    });
  });

  describe('parseEnabledToolGroups with official queue groups', () => {
    it('should parse official_queue group', () => {
      const groups = parseEnabledToolGroups('official_queue');
      expect(groups).toEqual(['official_queue']);
    });

    it('should include official_queue group in default', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toContain('official_queue');
    });
  });

  describe('Tool Group Registration with Official Queue', () => {
    it('should register all official queue tools when official_queue is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory, 'official_queue');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');
      expect(toolNames).toContain('approve_official_mirror_queue_item');
      expect(toolNames).toContain('approve_mirror_no_modify');
      expect(toolNames).toContain('reject_official_mirror_queue_item');
      expect(toolNames).toContain('add_official_mirror_to_regular_queue');
      expect(toolNames).toContain('unlink_official_mirror_queue_item');
    });

    it('should only register read-only tools when official_queue_readonly is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory, 'official_queue_readonly');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(2); // Only read-only official queue tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');
      // Write tools should NOT be present
      expect(toolNames).not.toContain('approve_official_mirror_queue_item');
      expect(toolNames).not.toContain('reject_official_mirror_queue_item');
    });

    it('should register all good_jobs tools when good_jobs group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory, 'good_jobs');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('list_good_jobs');
      expect(toolNames).toContain('get_good_job');
      expect(toolNames).toContain('list_good_job_cron_schedules');
      expect(toolNames).toContain('list_good_job_processes');
      expect(toolNames).toContain('get_good_job_queue_statistics');
      expect(toolNames).toContain('retry_good_job');
      expect(toolNames).toContain('discard_good_job');
      expect(toolNames).toContain('reschedule_good_job');
      expect(toolNames).toContain('force_trigger_good_job_cron');
      expect(toolNames).toContain('cleanup_good_jobs');
    });

    it('should only register read-only tools when good_jobs_readonly is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory, 'good_jobs_readonly');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(5); // Only read-only good_jobs tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('list_good_jobs');
      expect(toolNames).toContain('get_good_job');
      expect(toolNames).toContain('list_good_job_cron_schedules');
      expect(toolNames).toContain('list_good_job_processes');
      expect(toolNames).toContain('get_good_job_queue_statistics');
      // Write tools should NOT be present
      expect(toolNames).not.toContain('retry_good_job');
      expect(toolNames).not.toContain('discard_good_job');
      expect(toolNames).not.toContain('reschedule_good_job');
      expect(toolNames).not.toContain('force_trigger_good_job_cron');
      expect(toolNames).not.toContain('cleanup_good_jobs');
    });
  });

  describe('GoodJob Tools', () => {
    const mockServer = {} as Server;

    describe('list_good_jobs', () => {
      it('should fetch and format good jobs', async () => {
        const { listGoodJobs } = await import('../../shared/src/tools/list-good-jobs.js');
        const mockClient = createMockClient({
          getGoodJobs: vi.fn().mockResolvedValue({
            jobs: [
              {
                id: 'job-1',
                job_class: 'SyncMCPServersJob',
                queue_name: 'default',
                status: 'succeeded',
                scheduled_at: '2024-01-15T10:00:00Z',
              },
              {
                id: 'job-2',
                job_class: 'ProcessMirrorsJob',
                queue_name: 'low_priority',
                status: 'failed',
                scheduled_at: '2024-01-15T11:00:00Z',
                error: 'Connection timeout',
              },
            ],
            pagination: {
              current_page: 1,
              total_pages: 1,
              total_count: 2,
              has_next: false,
              limit: 30,
            },
          }),
        });

        const tool = listGoodJobs(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(mockClient.getGoodJobs).toHaveBeenCalledWith({});
        expect(result.content[0].text).toContain('Found 2 jobs');
        expect(result.content[0].text).toContain('SyncMCPServersJob');
        expect(result.content[0].text).toContain('ProcessMirrorsJob');
        expect(result.content[0].text).toContain('Connection timeout');
      });

      it('should pass filter parameters correctly', async () => {
        const { listGoodJobs } = await import('../../shared/src/tools/list-good-jobs.js');
        const mockClient = createMockClient({
          getGoodJobs: vi.fn().mockResolvedValue({
            jobs: [],
            pagination: { current_page: 1, total_pages: 1, total_count: 0 },
          }),
        });

        const tool = listGoodJobs(mockServer, () => mockClient);
        await tool.handler({
          queue_name: 'default',
          status: 'failed',
          job_class: 'SyncJob',
          limit: 10,
          offset: 5,
        });

        expect(mockClient.getGoodJobs).toHaveBeenCalledWith({
          queue_name: 'default',
          status: 'failed',
          job_class: 'SyncJob',
          after: undefined,
          before: undefined,
          limit: 10,
          offset: 5,
        });
      });

      it('should handle errors gracefully', async () => {
        const { listGoodJobs } = await import('../../shared/src/tools/list-good-jobs.js');
        const mockClient = createMockClient({
          getGoodJobs: vi.fn().mockRejectedValue(new Error('API Error')),
        });

        const tool = listGoodJobs(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error fetching good jobs: API Error');
      });
    });

    describe('get_good_job', () => {
      it('should fetch and format a single good job', async () => {
        const { getGoodJob } = await import('../../shared/src/tools/get-good-job.js');
        const mockClient = createMockClient({
          getGoodJob: vi.fn().mockResolvedValue({
            id: 'job-123',
            job_class: 'SyncMCPServersJob',
            queue_name: 'default',
            status: 'failed',
            scheduled_at: '2024-01-15T10:00:00Z',
            performed_at: '2024-01-15T10:00:05Z',
            finished_at: '2024-01-15T10:00:10Z',
            error: 'Connection refused',
            created_at: '2024-01-15T09:00:00Z',
            updated_at: '2024-01-15T10:00:10Z',
          }),
        });

        const tool = getGoodJob(mockServer, () => mockClient);
        const result = await tool.handler({ id: 'job-123' });

        expect(mockClient.getGoodJob).toHaveBeenCalledWith('job-123');
        expect(result.content[0].text).toContain('GoodJob Details');
        expect(result.content[0].text).toContain('job-123');
        expect(result.content[0].text).toContain('SyncMCPServersJob');
        expect(result.content[0].text).toContain('Connection refused');
      });
    });

    describe('get_good_job_queue_statistics', () => {
      it('should fetch and format statistics', async () => {
        const { getGoodJobQueueStatistics } =
          await import('../../shared/src/tools/get-good-job-queue-statistics.js');
        const mockClient = createMockClient({
          getGoodJobStatistics: vi.fn().mockResolvedValue({
            total: 1500,
            scheduled: 10,
            queued: 5,
            running: 3,
            succeeded: 1400,
            failed: 50,
            discarded: 32,
          }),
        });

        const tool = getGoodJobQueueStatistics(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(mockClient.getGoodJobStatistics).toHaveBeenCalled();
        expect(result.content[0].text).toContain('GoodJob Queue Statistics');
        expect(result.content[0].text).toContain('1500');
        expect(result.content[0].text).toContain('Succeeded:** 1400');
        expect(result.content[0].text).toContain('Failed:** 50');
      });
    });

    describe('list_good_job_cron_schedules', () => {
      it('should fetch and format cron schedules', async () => {
        const { listGoodJobCronSchedules } =
          await import('../../shared/src/tools/list-good-job-cron-schedules.js');
        const mockClient = createMockClient({
          getGoodJobCronSchedules: vi.fn().mockResolvedValue([
            {
              cron_key: 'sync_servers',
              job_class: 'SyncMCPServersJob',
              cron_expression: '0 */6 * * *',
              description: 'Sync MCP servers every 6 hours',
              next_scheduled_at: '2024-01-15T18:00:00Z',
            },
          ]),
        });

        const tool = listGoodJobCronSchedules(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(mockClient.getGoodJobCronSchedules).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Found 1 cron schedules');
        expect(result.content[0].text).toContain('sync_servers');
        expect(result.content[0].text).toContain('SyncMCPServersJob');
        expect(result.content[0].text).toContain('0 */6 * * *');
      });
    });

    describe('list_good_job_processes', () => {
      it('should fetch and format processes', async () => {
        const { listGoodJobProcesses } =
          await import('../../shared/src/tools/list-good-job-processes.js');
        const mockClient = createMockClient({
          getGoodJobProcesses: vi.fn().mockResolvedValue([
            {
              id: 'proc-1',
              hostname: 'worker-1.example.com',
              pid: 12345,
              queues: ['default', 'mailers'],
              max_threads: 5,
              started_at: '2024-01-15T08:00:00Z',
            },
          ]),
        });

        const tool = listGoodJobProcesses(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(mockClient.getGoodJobProcesses).toHaveBeenCalled();
        expect(result.content[0].text).toContain('Found 1 active processes');
        expect(result.content[0].text).toContain('worker-1.example.com');
        expect(result.content[0].text).toContain('12345');
        expect(result.content[0].text).toContain('default, mailers');
      });
    });

    describe('retry_good_job', () => {
      it('should retry a job successfully', async () => {
        const { retryGoodJob } = await import('../../shared/src/tools/retry-good-job.js');
        const mockClient = createMockClient({
          retryGoodJob: vi.fn().mockResolvedValue({
            success: true,
            message: 'Job retried successfully',
            job: { id: 'job-1', status: 'queued' },
          }),
        });

        const tool = retryGoodJob(mockServer, () => mockClient);
        const result = await tool.handler({ id: 'job-1' });

        expect(mockClient.retryGoodJob).toHaveBeenCalledWith('job-1');
        expect(result.content[0].text).toContain('Successfully retried job');
        expect(result.content[0].text).toContain('Job retried successfully');
      });
    });

    describe('discard_good_job', () => {
      it('should discard a job successfully', async () => {
        const { discardGoodJob } = await import('../../shared/src/tools/discard-good-job.js');
        const mockClient = createMockClient({
          discardGoodJob: vi.fn().mockResolvedValue({
            success: true,
            message: 'Job discarded',
            job: { id: 'job-1', status: 'discarded' },
          }),
        });

        const tool = discardGoodJob(mockServer, () => mockClient);
        const result = await tool.handler({ id: 'job-1' });

        expect(mockClient.discardGoodJob).toHaveBeenCalledWith('job-1');
        expect(result.content[0].text).toContain('Successfully discarded job');
      });
    });

    describe('reschedule_good_job', () => {
      it('should reschedule a job successfully', async () => {
        const { rescheduleGoodJob } = await import('../../shared/src/tools/reschedule-good-job.js');
        const mockClient = createMockClient({
          rescheduleGoodJob: vi.fn().mockResolvedValue({
            success: true,
            message: 'Job rescheduled',
            job: {
              id: 'job-1',
              status: 'scheduled',
              scheduled_at: '2024-01-16T10:00:00Z',
            },
          }),
        });

        const tool = rescheduleGoodJob(mockServer, () => mockClient);
        const result = await tool.handler({
          id: 'job-1',
          scheduled_at: '2024-01-16T10:00:00Z',
        });

        expect(mockClient.rescheduleGoodJob).toHaveBeenCalledWith('job-1', '2024-01-16T10:00:00Z');
        expect(result.content[0].text).toContain('Successfully rescheduled job');
      });
    });

    describe('force_trigger_good_job_cron', () => {
      it('should trigger a cron schedule successfully', async () => {
        const { forceTriggerGoodJobCron } =
          await import('../../shared/src/tools/force-trigger-good-job-cron.js');
        const mockClient = createMockClient({
          forceTriggerGoodJobCron: vi.fn().mockResolvedValue({
            success: true,
            message: 'Cron schedule triggered',
          }),
        });

        const tool = forceTriggerGoodJobCron(mockServer, () => mockClient);
        const result = await tool.handler({ cron_key: 'sync_servers' });

        expect(mockClient.forceTriggerGoodJobCron).toHaveBeenCalledWith('sync_servers');
        expect(result.content[0].text).toContain('Successfully triggered cron schedule');
        expect(result.content[0].text).toContain('sync_servers');
      });
    });

    describe('cleanup_good_jobs', () => {
      it('should cleanup jobs successfully', async () => {
        const { cleanupGoodJobs } = await import('../../shared/src/tools/cleanup-good-jobs.js');
        const mockClient = createMockClient({
          cleanupGoodJobs: vi.fn().mockResolvedValue({
            success: true,
            message: 'Cleanup completed',
            deleted_count: 150,
          }),
        });

        const tool = cleanupGoodJobs(mockServer, () => mockClient);
        const result = await tool.handler({
          older_than_days: 30,
          status: 'succeeded',
        });

        expect(mockClient.cleanupGoodJobs).toHaveBeenCalledWith({
          older_than_days: 30,
          status: 'succeeded',
        });
        expect(result.content[0].text).toContain('Successfully cleaned up jobs');
        expect(result.content[0].text).toContain('150');
      });

      it('should handle errors gracefully', async () => {
        const { cleanupGoodJobs } = await import('../../shared/src/tools/cleanup-good-jobs.js');
        const mockClient = createMockClient({
          cleanupGoodJobs: vi.fn().mockRejectedValue(new Error('Permission denied')),
        });

        const tool = cleanupGoodJobs(mockServer, () => mockClient);
        const result = await tool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error cleaning up good jobs: Permission denied');
      });
    });
  });

  describe('Proctor Tools', () => {
    // Import the store so we can clear it between tests
    let examResultStore: typeof import('../../shared/src/exam-result-store.js').examResultStore;

    beforeAll(async () => {
      const storeModule = await import('../../shared/src/exam-result-store.js');
      examResultStore = storeModule.examResultStore;
    });

    afterEach(() => {
      examResultStore.clear();
    });

    describe('ExamResultStore', () => {
      it('should evict oldest entries when MAX_RESULTS (100) is exceeded', () => {
        const ids: string[] = [];
        for (let i = 0; i < 101; i++) {
          ids.push(
            examResultStore.store([i], 'runtime', 'test', [
              { type: 'exam_result', mirror_id: i, exam_id: `test-${i}`, status: 'pass' },
            ])
          );
        }

        // Store should be capped at 100
        expect(examResultStore.size).toBe(100);
        // First entry should have been evicted
        expect(examResultStore.get(ids[0])).toBeUndefined();
        // Last entry should still exist
        expect(examResultStore.get(ids[100])).toBeDefined();
        // Second entry should still exist (only the first was evicted)
        expect(examResultStore.get(ids[1])).toBeDefined();
      });
    });

    describe('run_exam_for_mirror', () => {
      it('should run exams, store results, and return truncated output with result_id', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockResolvedValue({
            lines: [
              { type: 'log', message: 'Starting exam for mirror 123' },
              {
                type: 'exam_result',
                mirror_id: 123,
                exam_id: 'auth-check',
                status: 'pass',
                data: { auth_type: 'none' },
              },
              { type: 'summary', total: 1, passed: 1, failed: 0, skipped: 0 },
            ],
          }),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [123],
          runtime_id: 'fly-machines-v1',
          exam_type: 'auth-check',
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Proctor Exam Results');
        expect(result.content[0].text).toContain('Result ID:');
        expect(result.content[0].text).toContain('123');
        expect(result.content[0].text).toContain('[LOG] Starting exam for mirror 123');
        expect(result.content[0].text).toContain('Exam Result');
        expect(result.content[0].text).toContain('Status: pass');
        expect(result.content[0].text).toContain('Summary');
        expect(result.content[0].text).toContain('Passed: 1');
        expect(result.content[0].text).toContain('get_exam_result');
        expect(result.content[0].text).toContain('save_results_for_mirror');
      });

      it('should truncate large tool listings in exam result data', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const largeToolList = Array.from({ length: 21 }, (_, i) => ({
          name: `tool_${i}`,
          description: `Description for tool ${i}`,
          inputSchema: { type: 'object', properties: { param: { type: 'string' } } },
        }));

        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockResolvedValue({
            lines: [
              {
                type: 'exam_result',
                mirror_id: 123,
                exam_id: 'init-tools-list',
                status: 'pass',
                data: { tools: largeToolList },
              },
            ],
          }),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [123],
          runtime_id: 'fly-machines-v1',
          exam_type: 'init-tools-list',
        });

        expect(result.content[0].text).toContain('tools_count');
        expect(result.content[0].text).toContain('21');
        expect(result.content[0].text).toContain('tools_truncated');
        // inputSchema should not appear in truncated output
        expect(result.content[0].text).not.toContain('inputSchema');
      });

      it('should store full results accessible via the store', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const examLines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'init-tools-list',
            status: 'pass',
            data: { tools: [{ name: 'tool_1', inputSchema: { type: 'object' } }] },
          },
        ];

        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockResolvedValue({ lines: examLines }),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [123],
          runtime_id: 'fly-machines-v1',
          exam_type: 'init-tools-list',
        });

        // Extract result_id from output
        const match = result.content[0].text.match(/Result ID: ([0-9a-f-]{36})/);
        expect(match).toBeTruthy();
        const resultId = match![1];

        // Full result should be in the store with untruncated data
        const stored = examResultStore.get(resultId);
        expect(stored).toBeDefined();
        expect(stored!.lines).toEqual(examLines);
        expect(stored!.mirror_ids).toEqual([123]);
        expect(stored!.runtime_id).toBe('fly-machines-v1');
        expect(stored!.exam_type).toBe('init-tools-list');
      });

      it('should extract exam_id from data payload when not at top level of stream line', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockResolvedValue({
            lines: [
              {
                type: 'exam_result',
                mirror_id: 123,
                // No exam_id at top level — only inside data
                data: {
                  mirror_id: 123,
                  exam_id: 'proctor-mcp-client-auth-check',
                  status: 'pass',
                },
              },
            ],
          }),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [123],
          runtime_id: 'fly-machines-v1',
          exam_type: 'auth-check',
        });

        // Should show the exam_id from data, not 'unknown'
        expect(result.content[0].text).toContain('Exam: proctor-mcp-client-auth-check');
        expect(result.content[0].text).not.toContain('Exam: unknown');
      });

      it('should format error lines from the stream', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockResolvedValue({
            lines: [{ type: 'error', message: 'Mirror 456 has no mcp_json' }],
          }),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [456],
          runtime_id: 'fly-machines-v1',
          exam_type: 'both',
        });

        expect(result.content[0].text).toContain('**Error**: Mirror 456 has no mcp_json');
      });

      it('should handle API errors gracefully', async () => {
        const { runExamForMirror } = await import('../../shared/src/tools/run-exam-for-mirror.js');
        const mockClient = createMockClient({
          runExamForMirror: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        });

        const tool = runExamForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_ids: [123],
          runtime_id: 'fly-machines-v1',
          exam_type: 'auth-check',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error running proctor exam: Invalid API key');
      });
    });

    describe('get_exam_result', () => {
      it('should retrieve full stored result by result_id', async () => {
        const { getExamResult } = await import('../../shared/src/tools/get-exam-result.js');
        const lines = [
          { type: 'log' as const, message: 'Starting exam' },
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'init-tools-list',
            status: 'pass',
            data: {
              tools: [
                {
                  name: 'tool_1',
                  inputSchema: { type: 'object', properties: { x: { type: 'string' } } },
                },
              ],
            },
          },
          { type: 'summary' as const, total: 1, passed: 1, failed: 0, skipped: 0 },
        ];

        const resultId = examResultStore.store([123], 'fly-machines-v1', 'init-tools-list', lines);

        const tool = getExamResult(mockServer, () => createMockClient());
        const result = await tool.handler({ result_id: resultId });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Exam Result Details');
        expect(result.content[0].text).toContain(resultId);
        // Full data including inputSchema should be present
        expect(result.content[0].text).toContain('inputSchema');
        expect(result.content[0].text).toContain('tool_1');
      });

      it('should filter by section', async () => {
        const { getExamResult } = await import('../../shared/src/tools/get-exam-result.js');
        const lines = [
          { type: 'log' as const, message: 'Starting exam' },
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
          },
          { type: 'summary' as const, total: 1, passed: 1, failed: 0, skipped: 0 },
        ];

        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const tool = getExamResult(mockServer, () => createMockClient());
        const result = await tool.handler({ result_id: resultId, section: 'exam_results' });

        expect(result.content[0].text).toContain('Section Filter: exam_results');
        expect(result.content[0].text).toContain('exam_result');
        expect(result.content[0].text).not.toContain('"type": "log"');
        expect(result.content[0].text).not.toContain('"type": "summary"');
      });

      it('should filter by mirror_id', async () => {
        const { getExamResult } = await import('../../shared/src/tools/get-exam-result.js');
        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
          },
          {
            type: 'exam_result' as const,
            mirror_id: 456,
            exam_id: 'auth-check',
            status: 'fail',
          },
        ];

        const resultId = examResultStore.store([123, 456], 'fly-machines-v1', 'auth-check', lines);

        const tool = getExamResult(mockServer, () => createMockClient());
        const result = await tool.handler({ result_id: resultId, mirror_id: 123 });

        expect(result.content[0].text).toContain('Mirror Filter: 123');
        expect(result.content[0].text).toContain('"mirror_id": 123');
        expect(result.content[0].text).not.toContain('"mirror_id": 456');
      });

      it('should return error for unknown result_id', async () => {
        const { getExamResult } = await import('../../shared/src/tools/get-exam-result.js');

        const tool = getExamResult(mockServer, () => createMockClient());
        const result = await tool.handler({
          result_id: '00000000-0000-0000-0000-000000000000',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('No stored result found');
      });
    });

    describe('save_results_for_mirror', () => {
      it('should save results using result_id from the store', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        // First, store a result as if run_exam_for_mirror had been called
        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
            data: { auth_type: 'none' },
          },
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'init-tools-list',
            status: 'pass',
            data: { tools_count: 5 },
          },
        ];
        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const saveFn = vi.fn().mockResolvedValue({
          saved: [
            { exam_id: 'auth-check', proctor_result_id: 201 },
            { exam_id: 'init-tools-list', proctor_result_id: 202 },
          ],
          errors: [],
        });
        const mockClient = createMockClient({ saveResultsForMirror: saveFn });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 123,
          result_id: resultId,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Proctor Results Saved');
        expect(result.content[0].text).toContain(`Result ID: ${resultId}`);
        expect(result.content[0].text).toContain('Successfully Saved (2)');

        // Verify the client was called with the correct extracted results
        expect(saveFn).toHaveBeenCalledWith({
          mirror_id: 123,
          runtime_id: 'fly-machines-v1',
          results: [
            { exam_id: 'auth-check', status: 'pass', data: { auth_type: 'none' } },
            { exam_id: 'init-tools-list', status: 'pass', data: { tools_count: 5 } },
          ],
        });

        // Store should be cleaned up after successful save (no errors)
        expect(examResultStore.get(resultId)).toBeUndefined();
      });

      it('should extract exam_id from data payload when not at top level of stream line', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        // Simulate the real-world bug: exam_id is inside line.data, NOT at line.exam_id
        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            // No exam_id or exam_type at top level!
            status: 'pass',
            data: {
              mirror_id: 123,
              exam_id: 'proctor-mcp-client-auth-check',
              result: { status: 'pass' },
            },
          },
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            // No exam_id at top level!
            data: {
              mirror_id: 123,
              exam_id: 'proctor-mcp-client-init-tools-list',
              status: 'pass',
              result: { status: 'pass', tools_count: 5 },
            },
          },
        ];
        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const saveFn = vi.fn().mockResolvedValue({
          saved: [
            { exam_id: 'proctor-mcp-client-auth-check', proctor_result_id: 301 },
            { exam_id: 'proctor-mcp-client-init-tools-list', proctor_result_id: 302 },
          ],
          errors: [],
        });
        const mockClient = createMockClient({ saveResultsForMirror: saveFn });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 123,
          result_id: resultId,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Successfully Saved (2)');

        // Verify exam_id was extracted from data payload, NOT 'unknown'
        expect(saveFn).toHaveBeenCalledWith(
          expect.objectContaining({
            results: expect.arrayContaining([
              expect.objectContaining({ exam_id: 'proctor-mcp-client-auth-check' }),
              expect.objectContaining({ exam_id: 'proctor-mcp-client-init-tools-list' }),
            ]),
          })
        );

        // Verify data uses the nested result object, not the full data wrapper
        const calledResults = saveFn.mock.calls[0][0].results;
        expect(calledResults[0].data).toEqual({ status: 'pass' });
        expect(calledResults[1].data).toEqual({ status: 'pass', tools_count: 5 });
      });

      it('should preserve output data from nested result when saving via result_id', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        // Simulate real proctor API response where output is inside line.data.result
        // This is the exact structure that caused empty output in production (issue #374)
        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 152,
            data: {
              mirror_id: 152,
              exam_id: 'proctor-mcp-client-auth-check',
              status: 'pass',
              result: {
                status: 'pass',
                output: { remotes: [{ authTypes: ['none'] }] },
                input: { mirror_id: 152 },
                processedBy: 'fly-machines-v1',
              },
            },
          },
          {
            type: 'exam_result' as const,
            mirror_id: 152,
            data: {
              mirror_id: 152,
              exam_id: 'proctor-mcp-client-init-tools-list',
              status: 'pass',
              result: {
                status: 'pass',
                output: { remotes: [{ tools: ['tool_a', 'tool_b'] }] },
                input: { mirror_id: 152 },
                processedBy: 'fly-machines-v1',
              },
            },
          },
        ];
        const resultId = examResultStore.store([152], 'fly-machines-v1', 'both', lines);

        const saveFn = vi.fn().mockResolvedValue({
          saved: [
            { exam_id: 'proctor-mcp-client-auth-check', proctor_result_id: 512 },
            { exam_id: 'proctor-mcp-client-init-tools-list', proctor_result_id: 513 },
          ],
          errors: [],
        });
        const mockClient = createMockClient({ saveResultsForMirror: saveFn });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 152,
          result_id: resultId,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Successfully Saved (2)');

        // Verify data contains the nested result object (with output), NOT the
        // full data wrapper (which would nest output too deeply)
        const calledResults = saveFn.mock.calls[0][0].results;

        // Auth-check result should have output with remotes/authTypes
        expect(calledResults[0].data).toEqual({
          status: 'pass',
          output: { remotes: [{ authTypes: ['none'] }] },
          input: { mirror_id: 152 },
          processedBy: 'fly-machines-v1',
        });

        // Init-tools-list result should have output with remotes/tools
        expect(calledResults[1].data).toEqual({
          status: 'pass',
          output: { remotes: [{ tools: ['tool_a', 'tool_b'] }] },
          input: { mirror_id: 152 },
          processedBy: 'fly-machines-v1',
        });
      });

      it('should unwrap double-nested data.result.result from real proctor API structure (issue #376)', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        // This is the EXACT structure from the real proctor API (per issue #376 comment).
        // The payload is at data.result.result, not data.result.
        const lines = [
          {
            type: 'exam_result' as const,
            data: {
              mirror_id: 152,
              server_slug: 'canva',
              exam_id: 'proctor-mcp-client-auth-check',
              runtime_image: 'registry.fly.io/proctor-mcp-client:latest',
              entry_key: 'remotes[0]',
              mcp_json_id: 12,
              result: {
                exam_id: '5ce3bfea-1234-5678-9abc-def012345678',
                machine_id: '9080409db04e48',
                status: 'completed',
                result: {
                  input: {
                    'mcp.json': {
                      'remotes[0]': { url: 'https://example.com', type: 'streamable-http' },
                    },
                    'server.json': { name: 'canva', title: 'Canva' },
                  },
                  output: {
                    'remotes[0]': { authType: 'oauth', detail: { scopes: ['read'] } },
                  },
                  processedBy: {
                    exam: 'proctor-mcp-client-auth-check',
                    runtime: 'proctor-mcp-client-0.0.21',
                    datetime: '2026-03-01T12:00:00.000Z',
                  },
                },
                error: null,
                logs: [{ ts: '2026-03-01T12:00:00.000Z', msg: 'Starting exam' }],
              },
            },
          },
        ];
        const resultId = examResultStore.store([152], 'fly-machines-v1', 'both', lines);

        const saveFn = vi.fn().mockResolvedValue({
          saved: [{ exam_id: 'proctor-mcp-client-auth-check', proctor_result_id: 520 }],
          errors: [],
        });
        const mockClient = createMockClient({ saveResultsForMirror: saveFn });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 152,
          result_id: resultId,
        });

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('Successfully Saved (1)');

        // The data sent to the API should be the innermost payload
        // { input, output, processedBy } — NOT the envelope with
        // exam_id, machine_id, logs, etc.
        const calledResults = saveFn.mock.calls[0][0].results;
        expect(calledResults[0].data).toEqual({
          input: {
            'mcp.json': { 'remotes[0]': { url: 'https://example.com', type: 'streamable-http' } },
            'server.json': { name: 'canva', title: 'Canva' },
          },
          output: {
            'remotes[0]': { authType: 'oauth', detail: { scopes: ['read'] } },
          },
          processedBy: {
            exam: 'proctor-mcp-client-auth-check',
            runtime: 'proctor-mcp-client-0.0.21',
            datetime: '2026-03-01T12:00:00.000Z',
          },
        });

        // Critically: no envelope fields like logs, machine_id, error
        expect(calledResults[0].data).not.toHaveProperty('logs');
        expect(calledResults[0].data).not.toHaveProperty('machine_id');
        expect(calledResults[0].data).not.toHaveProperty('error');
        // And output must be at the top level, not nested under result
        expect(calledResults[0].data).toHaveProperty('output');
      });

      it('should not clean up store when save has errors', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
            data: { auth_type: 'none' },
          },
        ];
        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const saveFn = vi.fn().mockResolvedValue({
          saved: [],
          errors: [{ exam_id: 'auth-check', error: 'Server error' }],
        });
        const mockClient = createMockClient({ saveResultsForMirror: saveFn });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        await tool.handler({
          mirror_id: 123,
          result_id: resultId,
        });

        // Store should NOT be cleaned up when there are errors (allow retry)
        expect(examResultStore.get(resultId)).toBeDefined();
      });

      it('should require result_id parameter', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const tool = saveResultsForMirror(mockServer, () => createMockClient());
        await expect(
          tool.handler({
            mirror_id: 123,
          })
        ).rejects.toThrow(/Required/);
      });

      it('should return error for unknown result_id', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const tool = saveResultsForMirror(mockServer, () => createMockClient());
        const result = await tool.handler({
          mirror_id: 123,
          result_id: '00000000-0000-0000-0000-000000000000',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('No stored result found');
      });

      it('should report partial failures', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
          },
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'init-tools-list',
            status: 'pass',
          },
        ];
        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const mockClient = createMockClient({
          saveResultsForMirror: vi.fn().mockResolvedValue({
            saved: [{ exam_id: 'auth-check', proctor_result_id: 101 }],
            errors: [{ exam_id: 'init-tools-list', error: 'Duplicate result' }],
          }),
        });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 123,
          result_id: resultId,
        });

        expect(result.content[0].text).toContain('Successfully Saved (1)');
        expect(result.content[0].text).toContain('Errors (1)');
        expect(result.content[0].text).toContain('init-tools-list: Duplicate result');

        // Store should NOT be cleaned up when there are errors
        expect(examResultStore.get(resultId)).toBeDefined();
      });

      it('should handle API errors gracefully', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 999,
            exam_id: 'auth-check',
            status: 'pass',
          },
        ];
        const resultId = examResultStore.store([999], 'fly-machines-v1', 'both', lines);

        const mockClient = createMockClient({
          saveResultsForMirror: vi
            .fn()
            .mockRejectedValue(new Error('Mirror not found with ID: 999')),
        });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 999,
          result_id: resultId,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
          'Error saving proctor results: Mirror not found with ID: 999'
        );
      });

      it('should handle string error format from API', async () => {
        const { saveResultsForMirror } =
          await import('../../shared/src/tools/save-results-for-mirror.js');

        const lines = [
          {
            type: 'exam_result' as const,
            mirror_id: 123,
            exam_id: 'auth-check',
            status: 'pass',
          },
        ];
        const resultId = examResultStore.store([123], 'fly-machines-v1', 'both', lines);

        const mockClient = createMockClient({
          saveResultsForMirror: vi.fn().mockResolvedValue({
            saved: [],
            errors: ['Missing exam_id or result data for entry'],
          }),
        });

        const tool = saveResultsForMirror(mockServer, () => mockClient);
        const result = await tool.handler({
          mirror_id: 123,
          result_id: resultId,
        });

        expect(result.content[0].text).toContain('Errors (1)');
        expect(result.content[0].text).toContain('Missing exam_id or result data for entry');
      });
    });
  });
});
