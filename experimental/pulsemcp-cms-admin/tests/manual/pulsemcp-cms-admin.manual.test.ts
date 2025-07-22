import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

describe('PulseMCP CMS Admin - Manual Tests with Real API', () => {
  let client: TestMCPClient;
  let testSlug: string;
  let testImagePath: string;

  beforeAll(async () => {
    // Ensure API key is set
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    // Create a test image file
    testImagePath = path.join(__dirname, 'test-image.png');
    // Create a simple 1x1 PNG
    const pngData = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01,
      0x08,
      0x02,
      0x00,
      0x00,
      0x00,
      0x90,
      0x77,
      0x53,
      0xde,
      0x00,
      0x00,
      0x00,
      0x0c,
      0x49,
      0x44,
      0x41,
      0x54,
      0x08,
      0xd7,
      0x63,
      0xf8,
      0xcf,
      0xc0,
      0x00,
      0x00,
      0x03,
      0x01,
      0x01,
      0x00,
      0x18,
      0xdd,
      0x8d,
      0xb4,
      0x79,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);
    await writeFile(testImagePath, pngData);

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath: serverPath,
      env: {
        ...process.env,
        PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY,
      },
    });
    await client.connect();

    // Generate a unique test slug
    testSlug = `mcp-test-post-${Date.now()}`;
  });

  afterAll(async () => {
    // Clean up test image
    if (existsSync(testImagePath)) {
      await unlink(testImagePath);
    }

    await client.disconnect();
  });

  describe('Newsletter Post Operations', () => {
    it('should list existing newsletter posts', async () => {
      const result = await client.callTool('get_newsletter_posts', {
        page: 1,
      });

      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toMatch(/Found \d+ newsletter posts/);
    });

    it('should search for specific posts', async () => {
      const result = await client.callTool('get_newsletter_posts', {
        search: 'MCP',
        page: 1,
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      // Should find posts about MCP
      expect(text).toMatch(/Found \d+ newsletter posts/);
    });

    it('should create a new draft post', async () => {
      const result = await client.callTool('draft_newsletter_post', {
        title: 'Test Post from MCP Server',
        body: '<p>This is a test post created by the PulseMCP CMS Admin MCP server during manual testing.</p>',
        slug: testSlug,
        author_id: 1, // Assuming author ID 1 exists
        short_description: 'A test post created during manual testing',
        category: 'newsletter',
      });

      expect(result.content[0].text).toContain('Successfully created draft newsletter post!');
      expect(result.content[0].text).toContain('Test Post from MCP Server');
      expect(result.content[0].text).toContain('Status: draft');
      expect(result.content[0].text).toContain('Category: newsletter');
    });

    it('should retrieve the created post', async () => {
      const result = await client.callTool('get_newsletter_post', {
        slug: testSlug,
      });

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;
      expect(text).toContain('# Test Post from MCP Server');
      expect(text).toContain('Status: draft');
      expect(text).toContain('This is a test post created by the PulseMCP CMS Admin MCP server');
    });

    it('should update the post', async () => {
      const result = await client.callTool('update_newsletter_post', {
        slug: testSlug,
        title: 'Updated Test Post from MCP Server',
        short_description: 'Updated description during manual testing',
        last_updated: new Date().toISOString(),
      });

      expect(result.content[0].text).toContain('Successfully updated newsletter post!');
      expect(result.content[0].text).toContain('Fields updated:');
      expect(result.content[0].text).toContain('- title');
      expect(result.content[0].text).toContain('- short_description');
      expect(result.content[0].text).toContain('- last_updated');
    });

    it('should upload an image for the post', async () => {
      const result = await client.callTool('upload_image', {
        post_slug: testSlug,
        file_name: 'test-manual-upload.png',
        file_path: testImagePath,
      });

      expect(result.content[0].text).toContain('Successfully uploaded image!');
      expect(result.content[0].text).toContain(`**Post Slug:** ${testSlug}`);
      expect(result.content[0].text).toMatch(/\*\*URL:\*\* https:\/\/.*test-manual-upload\.png/);
    });

    it('should verify the updated post details', async () => {
      const result = await client.callTool('get_newsletter_post', {
        slug: testSlug,
      });

      const text = result.content[0].text;
      expect(text).toContain('# Updated Test Post from MCP Server');
      expect(text).toContain('Updated description during manual testing');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent post gracefully', async () => {
      const result = await client.callTool('get_newsletter_post', {
        slug: 'this-post-definitely-does-not-exist-12345',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Post not found');
    });

    it('should handle duplicate slug creation', async () => {
      // Try to create a post with the same slug
      const result = await client.callTool('draft_newsletter_post', {
        title: 'Duplicate Post',
        body: '<p>This should fail</p>',
        slug: testSlug, // Using the same slug as before
        author_id: 1,
      });

      // This should fail with a validation error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating draft post');
    });
  });
});
