import { describe, it, expect, vi } from 'vitest';
import { getNewsletterPosts } from '../../shared/src/tools/get-newsletter-posts.js';
import { getNewsletterPost } from '../../shared/src/tools/get-newsletter-post.js';
import { draftNewsletterPost } from '../../shared/src/tools/draft-newsletter-post.js';
import { updateNewsletterPost } from '../../shared/src/tools/update-newsletter-post.js';
import { uploadImage } from '../../shared/src/tools/upload-image.js';
import { getAuthors } from '../../shared/src/tools/get-authors.js';
import type {
  IPulseMCPAdminClient,
  Post,
  PostsResponse,
  Author,
  AuthorsResponse,
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
      };

      const tool = getAuthors(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching authors: API Error');
    });
  });
});
