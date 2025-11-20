import { describe, it, expect, vi } from 'vitest';
import { getNewsletterPosts } from '../../shared/src/tools/get-newsletter-posts.js';
import { getNewsletterPost } from '../../shared/src/tools/get-newsletter-post.js';
import { draftNewsletterPost } from '../../shared/src/tools/draft-newsletter-post.js';
import { updateNewsletterPost } from '../../shared/src/tools/update-newsletter-post.js';
import { uploadImage } from '../../shared/src/tools/upload-image.js';
import { getAuthors } from '../../shared/src/tools/get-authors.js';
import { searchMCPImplementations } from '../../shared/src/tools/search-mcp-implementations.js';
import { getDraftMCPImplementations } from '../../shared/src/tools/get-draft-mcp-implementations.js';
import { saveMCPImplementation } from '../../shared/src/tools/save-mcp-implementation.js';
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

      const mockClient: IPulseMCPAdminClient = {
        getPosts: vi.fn().mockResolvedValue({
          posts: mockPosts.map((p) => ({ ...p, author: undefined })), // Remove author objects
          pagination: {
            current_page: 1,
            total_pages: 2,
            total_count: 10,
          },
        } as PostsResponse),
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        uploadImage: vi.fn(),
        getAuthors: vi.fn(),
        getAuthorBySlug: vi.fn(),
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
        getMCPServerBySlug: vi.fn(),
        getMCPServerById: vi.fn(),
        getMCPClientBySlug: vi.fn(),
        getMCPClientById: vi.fn(),
        searchMCPImplementations: vi.fn(),
      };

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
      const groups = parseEnabledToolGroups('newsletter,server_queue_readonly,server_queue_all');
      expect(groups).toEqual(['newsletter', 'server_queue_readonly', 'server_queue_all']);
    });

    it('should parse single group', () => {
      const groups = parseEnabledToolGroups('newsletter');
      expect(groups).toEqual(['newsletter']);
    });

    it('should handle whitespace in group names', () => {
      const groups = parseEnabledToolGroups(
        'newsletter , server_queue_readonly , server_queue_all '
      );
      expect(groups).toEqual(['newsletter', 'server_queue_readonly', 'server_queue_all']);
    });

    it('should filter out invalid group names', () => {
      const groups = parseEnabledToolGroups('newsletter,invalid_group,server_queue_readonly');
      expect(groups).toEqual(['newsletter', 'server_queue_readonly']);
    });

    it('should map legacy server_queue to server_queue_all for backward compatibility', () => {
      const groups = parseEnabledToolGroups('server_queue');
      expect(groups).toEqual(['server_queue_all']);
    });

    it('should handle legacy server_queue mixed with new groups', () => {
      const groups = parseEnabledToolGroups('newsletter,server_queue');
      expect(groups).toEqual(['newsletter', 'server_queue_all']);
    });

    it('should return all groups when empty string provided', () => {
      const groups = parseEnabledToolGroups('');
      expect(groups).toEqual(['newsletter', 'server_queue_readonly', 'server_queue_all']);
    });

    it('should return all groups when no parameter provided', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toEqual(['newsletter', 'server_queue_readonly', 'server_queue_all']);
    });

    it('should prioritize parameter over environment variable', () => {
      const originalEnv = process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS;
      process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS = 'server_queue_readonly';

      const groups = parseEnabledToolGroups('newsletter');
      expect(groups).toEqual(['newsletter']);

      // Restore original env
      if (originalEnv) {
        process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS = originalEnv;
      } else {
        delete process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS;
      }
    });

  });

  describe('createRegisterTools with toolgroups filtering', () => {
    const createMockClient = (): IPulseMCPAdminClient => ({
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
    });

    it('should register only newsletter tools when newsletter group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

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

    it('should register only server_queue tools when server_queue_all group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory, 'server_queue_all');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).not.toContain('get_newsletter_posts');
    });

    it('should register all tools when all groups are enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(
        clientFactory,
        'newsletter,server_queue_readonly,server_queue_all'
      );
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(9);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
    });

    it('should register all tools when no groups specified (default)', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const clientFactory = () => createMockClient();

      const registerTools = createRegisterTools(clientFactory);
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(9);
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
      expect(text).toContain('Successfully saved MCP implementation!');
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

    it('should require ID parameter', async () => {
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
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);

      // Test with missing ID - should throw validation error
      await expect(async () => {
        await tool.handler({ name: 'Test' } as unknown);
      }).rejects.toThrow();
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
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100, status: 'live' });

      expect(mockClient.saveMCPImplementation).toHaveBeenCalledWith(100, { status: 'live' });
      expect(result.content[0].text).toContain('Successfully saved MCP implementation!');
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

      expect(result.content[0].text).toContain('Successfully saved MCP implementation!');
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

      expect(result.content[0].text).toContain('Successfully saved MCP implementation!');
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
      };

      const tool = saveMCPImplementation(mockServer, () => mockClient);
      const result = await tool.handler({ id: 100, name: 'Updated' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error saving MCP implementation: Invalid API key');
    });
  });
});
