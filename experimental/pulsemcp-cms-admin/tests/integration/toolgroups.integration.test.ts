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

      expect(tools.tools).toHaveLength(5); // search, get_drafts, find_providers, save, send_notification
      const toolNames = tools.tools.map((t) => t.name);

      // Server queue tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('send_impl_posted_notif');

      // Newsletter tools should NOT be present
      expect(toolNames).not.toContain('get_newsletter_posts');
      expect(toolNames).not.toContain('get_newsletter_post');
      expect(toolNames).not.toContain('draft_newsletter_post');
      expect(toolNames).not.toContain('update_newsletter_post');
      expect(toolNames).not.toContain('upload_image');
      expect(toolNames).not.toContain('get_authors');

      // Official queue tools should NOT be present
      expect(toolNames).not.toContain('get_official_mirror_queue_items');
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

      expect(tools.tools).toHaveLength(11); // 6 newsletter + 5 server_queue_all
      const toolNames = tools.tools.map((t) => t.name);

      // All newsletter tools should be present
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');

      // All server_queue_all tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('send_impl_posted_notif');

      // Official queue tools should NOT be present (not enabled)
      expect(toolNames).not.toContain('get_official_mirror_queue_items');
    });
  });

  describe('official_queue_all group only', () => {
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
          PULSEMCP_ADMIN_ENABLED_TOOLGROUPS: 'official_queue_all',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register official_queue_all tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(7); // All 7 official queue tools
      const toolNames = tools.tools.map((t) => t.name);

      // Official queue tools should be present
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');
      expect(toolNames).toContain('approve_official_mirror_queue_item');
      expect(toolNames).toContain('approve_mirror_no_modify');
      expect(toolNames).toContain('reject_official_mirror_queue_item');
      expect(toolNames).toContain('add_official_mirror_to_regular_queue');
      expect(toolNames).toContain('unlink_official_mirror_queue_item');

      // Newsletter tools should NOT be present
      expect(toolNames).not.toContain('get_newsletter_posts');

      // Server queue tools should NOT be present
      expect(toolNames).not.toContain('search_mcp_implementations');
    });
  });

  describe('official_queue_readonly group only', () => {
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
          PULSEMCP_ADMIN_ENABLED_TOOLGROUPS: 'official_queue_readonly',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register official_queue_readonly tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(2); // Only read-only official queue tools
      const toolNames = tools.tools.map((t) => t.name);

      // Read-only official queue tools should be present
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');

      // Write tools should NOT be present
      expect(toolNames).not.toContain('approve_official_mirror_queue_item');
      expect(toolNames).not.toContain('reject_official_mirror_queue_item');

      // Other groups should NOT be present
      expect(toolNames).not.toContain('get_newsletter_posts');
      expect(toolNames).not.toContain('search_mcp_implementations');
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

      expect(tools.tools).toHaveLength(18); // 6 newsletter + 5 server_queue_all + 7 official_queue_all
      const toolNames = tools.tools.map((t) => t.name);

      // Newsletter tools
      expect(toolNames).toContain('get_newsletter_posts');

      // Server queue tools
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('send_impl_posted_notif');

      // Official queue tools
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');
      expect(toolNames).toContain('approve_official_mirror_queue_item');
      expect(toolNames).toContain('approve_mirror_no_modify');
      expect(toolNames).toContain('reject_official_mirror_queue_item');
      expect(toolNames).toContain('add_official_mirror_to_regular_queue');
      expect(toolNames).toContain('unlink_official_mirror_queue_item');
    });
  });
});
