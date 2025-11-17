import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import type { Post } from '../../shared/src/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PulseMCP CMS Admin MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  const mockPosts: Post[] = [
    {
      id: 1,
      title: 'Integration Test Post',
      body: '<p>This is a test post</p>',
      slug: 'integration-test-post',
      author_id: 1,
      status: 'live',
      category: 'newsletter',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
      author: { id: 1, name: 'Test Author' },
      short_description: 'A test post for integration testing',
    },
    {
      id: 2,
      title: 'Another Test Post',
      body: '<p>Another test</p>',
      slug: 'another-test-post',
      author_id: 1,
      status: 'draft',
      category: 'newsletter',
      created_at: '2024-01-14T00:00:00Z',
      updated_at: '2024-01-14T00:00:00Z',
    },
  ];

  const mockData = {
    posts: mockPosts,
    postsBySlug: {
      'integration-test-post': mockPosts[0],
      'another-test-post': mockPosts[1],
    },
    authorsBySlug: {
      'test-author': {
        id: 1,
        name: 'Test Author',
        slug: 'test-author',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    },
    createPostResponse: {
      ...mockPosts[0],
      id: 100,
      title: 'New Draft Post',
      slug: 'new-draft-post',
      status: 'draft' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    uploadImageResponse: {
      url: 'https://storage.pulsemcp.com/images/newsletter/test-post/uploaded.png',
    },
  };

  beforeAll(async () => {
    const serverPath = path.join(
      __dirname,
      '../../local/build/local/src/index.integration-with-mock.js'
    );

    client = new TestMCPClient({
      serverPath: serverPath,
      env: {
        ...process.env,
        PULSEMCP_MOCK_DATA: JSON.stringify(mockData),
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('get_newsletter_posts', () => {
    it('should list newsletter posts', async () => {
      const result = await client.callTool('get_newsletter_posts', {});

      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 newsletter posts');
      expect(result.content[0].text).toContain('Integration Test Post');
      expect(result.content[0].text).toContain('Another Test Post');
    });

    it('should support search and pagination', async () => {
      const result = await client.callTool('get_newsletter_posts', {
        search: 'integration',
        page: 1,
      });

      expect(result.content[0].text).toContain('Found 1 newsletter posts');
      expect(result.content[0].text).toContain('Integration Test Post');
      expect(result.content[0].text).not.toContain('Another Test Post');
    });
  });

  describe('get_newsletter_post', () => {
    it('should retrieve a specific post', async () => {
      const result = await client.callTool('get_newsletter_post', {
        slug: 'integration-test-post',
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('# Integration Test Post');
      expect(text).toContain('Test Author');
      expect(text).toContain('This is a test post');
      expect(text).toContain('**Status:** live');
    });

    it('should handle post not found', async () => {
      const result = await client.callTool('get_newsletter_post', {
        slug: 'non-existent-post',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Post not found');
    });
  });

  describe('draft_newsletter_post', () => {
    it('should create a new draft post', async () => {
      const result = await client.callTool('draft_newsletter_post', {
        title: 'New Draft Post',
        body: '<p>Draft content</p>',
        slug: 'new-draft-post',
        author_slug: 'test-author',
      });

      expect(result.content[0].text).toContain('Successfully created draft newsletter post!');
      expect(result.content[0].text).toContain('New Draft Post');
      expect(result.content[0].text).toContain('**Status:** draft');
    });

    it('should validate required fields', async () => {
      const result = await client.callTool('draft_newsletter_post', {
        title: 'Missing fields',
        // Missing required fields: body, slug, author_slug
      } as unknown);

      expect(result.isError).toBe(true);
    });
  });

  describe('update_newsletter_post', () => {
    it('should update an existing post', async () => {
      const result = await client.callTool('update_newsletter_post', {
        slug: 'integration-test-post',
        title: 'Updated Title',
        short_description: 'Updated description',
      });

      expect(result.content[0].text).toContain('Successfully updated newsletter post!');
      expect(result.content[0].text).toContain('Fields updated:');
      expect(result.content[0].text).toContain('- title');
      expect(result.content[0].text).toContain('- short_description');
    });

    it('should handle no updates', async () => {
      const result = await client.callTool('update_newsletter_post', {
        slug: 'test-post',
      });

      expect(result.content[0].text).toContain('No changes provided');
    });
  });

  describe('upload_image', () => {
    it('should validate required parameters', async () => {
      const result = await client.callTool('upload_image', {
        post_slug: 'test-post',
        // Missing file_name and file_path
      } as unknown);

      expect(result.isError).toBe(true);
    });
  });

  describe('search_mcp_implementations', () => {
    it('should search for MCP implementations', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('MCP implementation');
    });

    it('should filter by type', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'test',
        type: 'server',
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('MCP implementation');
    });

    it('should filter by status', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'test',
        status: 'live',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('MCP implementation');
    });

    it('should handle pagination', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('MCP implementation');
    });

    it('should validate required fields', async () => {
      const result = await client.callTool('search_mcp_implementations', {} as unknown);

      expect(result.isError).toBe(true);
    });
  });

  describe('tool listing', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(7);
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');
      expect(toolNames).toContain('search_mcp_implementations');
    });
  });
});
