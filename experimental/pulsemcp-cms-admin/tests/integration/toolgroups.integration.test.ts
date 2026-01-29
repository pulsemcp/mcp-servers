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
          TOOL_GROUPS: 'newsletter',
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

    it('should error when calling server_directory tool', async () => {
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

  describe('server_directory group only', () => {
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
          TOOL_GROUPS: 'server_directory',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register server_directory tools', async () => {
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

    it('should successfully call server_directory tool', async () => {
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

  describe('newsletter and server_directory groups enabled', () => {
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
          TOOL_GROUPS: 'newsletter,server_directory',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register newsletter and server_directory tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(11); // 6 newsletter + 5 server_directory
      const toolNames = tools.tools.map((t) => t.name);

      // All newsletter tools should be present
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');
      expect(toolNames).toContain('get_authors');

      // All server_directory tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');
      expect(toolNames).toContain('save_mcp_implementation');
      expect(toolNames).toContain('send_impl_posted_notif');

      // Official queue tools should NOT be present (not enabled)
      expect(toolNames).not.toContain('get_official_mirror_queue_items');
    });
  });

  describe('official_queue group only', () => {
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
          TOOL_GROUPS: 'official_queue',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register official_queue tools', async () => {
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

  describe('official_queue_readonly group', () => {
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
          TOOL_GROUPS: 'official_queue_readonly',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register read-only official_queue tools', async () => {
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
          // Don't set TOOL_GROUPS - should default to all base groups
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      // Ensure the env var is not set
      delete client['env']?.TOOL_GROUPS;
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register all tools by default', async () => {
      const tools = await client.listTools();

      // 6 newsletter + 5 server_directory + 7 official_queue + 5 unofficial_mirrors + 2 official_mirrors + 2 tenants + 5 mcp_jsons + 3 mcp_servers + 5 redirects = 40 tools
      expect(tools.tools).toHaveLength(40);
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

      // Unofficial mirrors tools
      expect(toolNames).toContain('get_unofficial_mirrors');
      expect(toolNames).toContain('get_unofficial_mirror');
      expect(toolNames).toContain('create_unofficial_mirror');
      expect(toolNames).toContain('update_unofficial_mirror');
      expect(toolNames).toContain('delete_unofficial_mirror');

      // Official mirrors tools (read-only)
      expect(toolNames).toContain('get_official_mirrors');
      expect(toolNames).toContain('get_official_mirror');

      // Tenants tools (read-only)
      expect(toolNames).toContain('get_tenants');
      expect(toolNames).toContain('get_tenant');

      // MCP JSONs tools
      expect(toolNames).toContain('get_mcp_jsons');
      expect(toolNames).toContain('get_mcp_json');
      expect(toolNames).toContain('create_mcp_json');
      expect(toolNames).toContain('update_mcp_json');
      expect(toolNames).toContain('delete_mcp_json');

      // MCP servers tools
      expect(toolNames).toContain('list_mcp_servers');
      expect(toolNames).toContain('get_mcp_server');
      expect(toolNames).toContain('update_mcp_server');

      // Redirect tools
      expect(toolNames).toContain('get_redirects');
      expect(toolNames).toContain('get_redirect');
      expect(toolNames).toContain('create_redirect');
      expect(toolNames).toContain('update_redirect');
      expect(toolNames).toContain('delete_redirect');
    });
  });

  describe('all _readonly groups', () => {
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
          TOOL_GROUPS: 'newsletter_readonly,server_directory_readonly,official_queue_readonly',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register only read-only tools from all groups', async () => {
      const tools = await client.listTools();

      // 3 newsletter read + 3 server_directory read + 2 official_queue read = 8 tools
      expect(tools.tools).toHaveLength(8);
      const toolNames = tools.tools.map((t) => t.name);

      // Read-only newsletter tools
      expect(toolNames).toContain('get_newsletter_posts');
      expect(toolNames).toContain('get_newsletter_post');
      expect(toolNames).toContain('get_authors');

      // Read-only server queue tools
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');

      // Read-only official queue tools
      expect(toolNames).toContain('get_official_mirror_queue_items');
      expect(toolNames).toContain('get_official_mirror_queue_item');

      // Write tools should NOT be present
      expect(toolNames).not.toContain('draft_newsletter_post');
      expect(toolNames).not.toContain('save_mcp_implementation');
      expect(toolNames).not.toContain('approve_official_mirror_queue_item');
    });
  });

  describe('mixed base and _readonly groups', () => {
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
          // Full access to newsletter, read-only to server_directory, no official_queue
          TOOL_GROUPS: 'newsletter,server_directory_readonly',
          PULSEMCP_MOCK_DATA: JSON.stringify({}),
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should allow different access levels per group', async () => {
      const tools = await client.listTools();

      // 6 newsletter (all) + 3 server_directory (read-only) = 9 tools
      expect(tools.tools).toHaveLength(9);
      const toolNames = tools.tools.map((t) => t.name);

      // Newsletter write tools should be present (full access)
      expect(toolNames).toContain('draft_newsletter_post');
      expect(toolNames).toContain('update_newsletter_post');
      expect(toolNames).toContain('upload_image');

      // Server queue read tools should be present
      expect(toolNames).toContain('search_mcp_implementations');
      expect(toolNames).toContain('get_draft_mcp_implementations');
      expect(toolNames).toContain('find_providers');

      // Server queue write tools should NOT be present (read-only)
      expect(toolNames).not.toContain('save_mcp_implementation');
      expect(toolNames).not.toContain('send_impl_posted_notif');

      // Official queue tools should NOT be present (not enabled)
      expect(toolNames).not.toContain('get_official_mirror_queue_items');
    });
  });
});
