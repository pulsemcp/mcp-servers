import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PulseMCP CMS Admin - Toolgroups Integration Tests', () => {
  describe('newsletter group only', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(
        __dirname,
        '../../local/build/local/src/index.integration-with-mock.js'
      );

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          PULSEMCP_ADMIN_ENABLED_TOOLGROUPS: 'newsletter',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register newsletter tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(6);
      const toolNames = tools.tools.map((t) => t.name);

      // Newsletter tools should be present
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');

      // Server queue tools should NOT be present
      expect(toolNames).not.toContain('search_mcp_implementations');
    });

    it('should error when calling server_queue tool', async () => {
      try {
        await client.callTool('search_mcp_implementations', {
          query: 'test',
        });
        // If we get here, the tool was found when it shouldn't have been
        expect(true).toBe(false);
      } catch (error) {
        // Expected - tool should not be registered
        expect(error).toBeDefined();
      }
    });
  });

  describe('server_queue_all group only', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(
        __dirname,
        '../../local/build/local/src/index.integration-with-mock.js'
      );

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          PULSEMCP_ADMIN_ENABLED_TOOLGROUPS: 'server_queue_all',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register server_queue_all tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(3);
      const toolNames = tools.tools.map((t) => t.name);

      // Server queue tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');

      // Newsletter tools should NOT be present
      expect(toolNames).not.toContain('get_newsletter_posts');
      expect(toolNames).not.toContain('get_newsletter_post');
      expect(toolNames).not.toContain('draft_newsletter_post');
      expect(toolNames).not.toContain('update_newsletter_post');
      expect(toolNames).not.toContain('upload_image');
      expect(toolNames).not.toContain('get_authors');
    });

    it('should successfully call server_queue_all tool', async () => {
      const result = await client.callTool('search_mcp_implementations', {
        query: 'test',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MCP implementation');
    });

    it('should error when calling newsletter tool', async () => {
      try {
        await client.callTool('get_newsletter_posts', {});
        // If we get here, the tool was found when it shouldn't have been
        expect(true).toBe(false);
      } catch (error) {
        // Expected - tool should not be registered
        expect(error).toBeDefined();
      }
    });
  });

  describe('both groups enabled', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(
        __dirname,
        '../../local/build/local/src/index.integration-with-mock.js'
      );

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          PULSEMCP_ADMIN_ENABLED_TOOLGROUPS: 'newsletter,server_queue_all',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register all tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(9);
      const toolNames = tools.tools.map((t) => t.name);

      // All tools should be present
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
    });
  });

  describe('no groups specified (default)', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(
        __dirname,
        '../../local/build/local/src/index.integration-with-mock.js'
      );

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          // Don't set PULSEMCP_ADMIN_ENABLED_TOOLGROUPS - should default to all
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      // Ensure the env var is not set
      delete client['env']?.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS;
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register all tools by default', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(9);
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('save_mcp_implementation');
    });
  });
});
