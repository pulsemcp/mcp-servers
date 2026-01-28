import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Manual Tests for mcp_servers Tool Group
 *
 * These tests hit the real PulseMCP Staging API to verify the mcp_servers tools work correctly.
 *
 * Tools tested:
 *   - list_mcp_servers: List and search MCP servers with filters
 *   - get_mcp_server: Get detailed info about a specific server by slug
 *   - update_mcp_server: Update server fields (only in mcp_servers group, not readonly)
 *
 * Required Environment:
 *   PULSEMCP_ADMIN_API_KEY: Admin API key for staging.pulsemcp.com
 *   PULSEMCP_ADMIN_API_URL: https://admin.staging.pulsemcp.com (optional, defaults to admin.pulsemcp.com)
 */

describe('mcp_servers Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    // Ensure API key is set
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath: serverPath,
      env: {
        ...process.env,
        PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY,
        PULSEMCP_ADMIN_API_URL:
          process.env.PULSEMCP_ADMIN_API_URL || 'https://admin.staging.pulsemcp.com',
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Tool Registration', () => {
    it('should register list_mcp_servers tool', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('list_mcp_servers');

      const tool = tools.tools.find((t) => t.name === 'list_mcp_servers');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('List MCP servers');
    });

    it('should register get_mcp_server tool', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('get_mcp_server');

      const tool = tools.tools.find((t) => t.name === 'get_mcp_server');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Get detailed information');
    });

    it('should register update_mcp_server tool', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('update_mcp_server');

      const tool = tools.tools.find((t) => t.name === 'update_mcp_server');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Update an MCP server');
    });
  });

  describe('list_mcp_servers', () => {
    it('should list MCP servers without filters', async () => {
      const result = await client.callTool('list_mcp_servers', {});

      // Debug: log the actual result if there's an error
      if (result.isError) {
        console.log('list_mcp_servers error:', result.content[0]?.text);
      }

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);
      expect(text).toContain('slug:');
      expect(text).toContain('Implementation ID:');

      console.log('List all servers (first page):', text.substring(0, 2000));
    });

    it('should search servers by query', async () => {
      const result = await client.callTool('list_mcp_servers', {
        q: 'filesystem',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);
      expect(text.toLowerCase()).toContain('filesystem');

      console.log('Search for "filesystem":', text);
    });

    it('should filter by status=live', async () => {
      const result = await client.callTool('list_mcp_servers', {
        status: 'live',
        limit: 10,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);
      expect(text).toContain('Status: live');

      console.log('Live servers:', text);
    });

    it('should filter by status=draft', async () => {
      const result = await client.callTool('list_mcp_servers', {
        status: 'draft',
        limit: 10,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);

      console.log('Draft servers:', text);
    });

    it('should filter by classification=official', async () => {
      const result = await client.callTool('list_mcp_servers', {
        classification: 'official',
        limit: 10,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);
      expect(text).toContain('Classification: official');

      console.log('Official servers:', text);
    });

    it('should filter by classification=community', async () => {
      const result = await client.callTool('list_mcp_servers', {
        classification: 'community',
        limit: 10,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);

      console.log('Community servers:', text);
    });

    it('should handle pagination with limit', async () => {
      const result = await client.callTool('list_mcp_servers', {
        limit: 5,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);
      // Count the numbered entries (should be at most 5)
      const matches = text.match(/^\d+\./gm);
      expect(matches?.length).toBeLessThanOrEqual(5);

      console.log('Paginated (limit 5):', text);
    });

    it('should handle pagination with offset', async () => {
      const result = await client.callTool('list_mcp_servers', {
        limit: 5,
        offset: 5,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);

      console.log('Paginated (offset 5):', text);
    });

    it('should combine multiple filters', async () => {
      const result = await client.callTool('list_mcp_servers', {
        q: 'mcp',
        status: 'live',
        classification: 'official',
        limit: 10,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toMatch(/Found \d+ MCP servers/);

      console.log('Combined filters:', text);
    });
  });

  describe('get_mcp_server', () => {
    // First get a list of servers to find a real slug
    let testServerSlug: string;
    let testImplementationId: number;

    beforeAll(async () => {
      // Get a list of servers to find a real slug to test with
      const listResult = await client.callTool('list_mcp_servers', {
        status: 'live',
        limit: 1,
      });

      // Check for errors
      if (listResult.isError) {
        console.log('Error getting list for test setup:', listResult.content[0]?.text);
        testServerSlug = 'tradeit'; // fallback to known working slug
        return;
      }

      // Extract a slug from the result
      const text = listResult.content[0].text;
      const slugMatch = text.match(/slug: `([^`]+)`/);
      if (slugMatch) {
        testServerSlug = slugMatch[1];
      } else {
        console.log('Could not extract slug from:', text.substring(0, 500));
        testServerSlug = 'tradeit'; // fallback to known working slug
      }

      // Extract implementation ID
      const implMatch = text.match(/Implementation ID: (\d+)/);
      if (implMatch) {
        testImplementationId = parseInt(implMatch[1], 10);
      }

      console.log(`Using test server slug: ${testServerSlug}, impl ID: ${testImplementationId}`);
    });

    it('should get detailed server info by slug', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      // Debug: log error if present
      if (result.isError) {
        console.log(`get_mcp_server error for slug ${testServerSlug}:`, result.content[0]?.text);
      }

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Should contain core fields (with markdown formatting)
      expect(text).toContain(`**Slug:** \`${testServerSlug}\``);
      expect(text).toContain('**Implementation ID:**');
      expect(text).toContain('**Status:**');

      console.log('Server details:', text);
    });

    it('should include provider information', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Many servers have providers
      if (text.includes('## Provider')) {
        expect(text).toMatch(/- \*\*Name:\*\*/);
      }

      console.log('Provider info extracted');
    });

    it('should include source code information', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Many servers have GitHub info
      if (text.includes('## Source Code')) {
        expect(text).toMatch(/- \*\*GitHub:\*\*/);
      }

      console.log('Source code info extracted');
    });

    it('should include canonical URLs if present', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      if (text.includes('## Canonical URLs')) {
        // Should list URLs with scopes
        expect(text).toMatch(/- \*\*(domain|subdomain|subfolder|url):\*\*/);
      }

      console.log('Canonical URLs extracted');
    });

    it('should include remote endpoints if present', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      if (text.includes('## Remote Endpoints')) {
        // Should include endpoint details
        expect(text).toMatch(/### \d+\./);
      }

      console.log('Remote endpoints extracted');
    });

    it('should include tags if present', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      if (text.includes('## Tags')) {
        // Tags are displayed as backticked items
        expect(text).toMatch(/`[^`]+`/);
      }

      console.log('Tags extracted');
    });

    it('should include package registry info if present', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      if (text.includes('**Package:**')) {
        // Should show registry and/or package name
        expect(text).toMatch(/\*\*Package:\*\* \w+/);
      }

      console.log('Package info extracted');
    });

    it('should include recommended flag if present', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Check if recommended is displayed (now always shown when field is defined)
      if (text.includes('**Recommended:**')) {
        expect(text).toMatch(/\*\*Recommended:\*\* (Yes|No)/);
      }

      console.log('Recommended flag checked');
    });

    it('should include timestamps', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('## Timestamps');
      expect(text).toMatch(/- \*\*Created:\*\*/);
      expect(text).toMatch(/- \*\*Updated:\*\*/);

      console.log('Timestamps extracted');
    });

    it('should handle non-existent server gracefully', async () => {
      const result = await client.callTool('get_mcp_server', {
        slug: 'this-server-does-not-exist-xyz123',
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;
      expect(text).toContain('Error');

      console.log('Non-existent server error:', text);
    });
  });

  describe('update_mcp_server', () => {
    // We need a test server to update - find one in draft status or use a known test server
    let testImplementationId: number;
    let testServerSlug: string;
    const originalValues: {
      short_description?: string;
      internal_notes?: string;
    } = {};

    beforeAll(async () => {
      // Find a draft server to test updates on (safer than modifying live servers)
      const listResult = await client.callTool('list_mcp_servers', {
        status: 'draft',
        limit: 1,
      });

      const text = listResult.content[0].text;

      // Extract implementation ID and slug
      const implMatch = text.match(/Implementation ID: (\d+)/);
      const slugMatch = text.match(/slug: `([^`]+)`/);

      if (implMatch && slugMatch) {
        testImplementationId = parseInt(implMatch[1], 10);
        testServerSlug = slugMatch[1];
      } else {
        // Skip tests if no draft server available
        console.log('No draft server found - skipping update tests');
        return;
      }

      // Get original values to restore later
      const getResult = await client.callTool('get_mcp_server', {
        slug: testServerSlug,
      });

      const serverText = getResult.content[0].text;
      const descMatch = serverText.match(/\*\*Short Description:\*\*\n([^\n]+)/);
      if (descMatch) {
        originalValues.short_description = descMatch[1];
      }

      console.log(
        `Using test server: ${testServerSlug} (impl ID: ${testImplementationId}) for update tests`
      );
    });

    it('should update basic info (name, short_description)', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const testDescription = `Test update at ${new Date().toISOString()}`;

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        short_description: testDescription,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('short_description');

      console.log('Update basic info result:', text);

      // Restore original value
      if (originalValues.short_description) {
        await client.callTool('update_mcp_server', {
          implementation_id: testImplementationId,
          short_description: originalValues.short_description,
        });
      }
    });

    it('should update status field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      // Just verify the API accepts status updates (don't actually change it)
      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        status: 'draft', // Keep it draft
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');

      console.log('Update status result:', text);
    });

    it('should update internal_notes field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const testNotes = `Manual test notes - ${new Date().toISOString()}`;

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        internal_notes: testNotes,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('internal_notes');

      console.log('Update internal_notes result:', text);
    });

    it('should update source_code location', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        source_code: {
          github_owner: 'test-owner',
          github_repo: 'test-repo',
          github_subfolder: 'src/test',
        },
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('source_code');

      console.log('Update source_code result:', text);
    });

    it('should update package_registry and package_name fields', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        package_registry: 'npm',
        package_name: '@test/test-package',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('package_registry');
      expect(text).toContain('package_name');

      console.log('Update package fields result:', text);
    });

    it('should update recommended flag', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      // Set recommended to true
      let result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        recommended: true,
      });

      expect(result.isError).toBeFalsy();
      let text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('recommended');

      console.log('Update recommended=true result:', text);

      // Set recommended to false
      result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        recommended: false,
      });

      expect(result.isError).toBeFalsy();
      text = result.content[0].text;
      expect(text).toContain('Successfully updated');

      console.log('Update recommended=false result:', text);
    });

    it('should update created_on_override field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const testDate = '2024-06-15';

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        created_on_override: testDate,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('created_on_override');

      console.log('Update created_on_override result:', text);
    });

    it('should update tags field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        tags: ['productivity', 'data'],
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('tags');

      console.log('Update tags result:', text);
    });

    it('should update canonical_urls field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        canonical_urls: [
          {
            url: 'https://github.com/test/test-repo',
            scope: 'subfolder',
            note: 'Manual test canonical URL',
          },
        ],
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('canonical_urls');

      console.log('Update canonical_urls result:', text);
    });

    it('should update remotes field', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        remotes: [
          {
            display_name: 'Test Remote',
            url_direct: 'https://test.example.com/api',
            transport: 'sse',
            host_platform: 'smithery',
            authentication_method: 'open',
            cost: 'free',
            status: 'draft',
            internal_notes: 'Manual test remote endpoint',
          },
        ],
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('remotes');

      console.log('Update remotes result:', text);
    });

    it('should update multiple fields at once', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
        short_description: 'Multi-field update test',
        internal_notes: 'Updated via manual test',
        package_registry: 'npm',
        recommended: false,
        tags: ['test'],
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      expect(text).toContain('Successfully updated');
      expect(text).toContain('short_description');
      expect(text).toContain('internal_notes');
      expect(text).toContain('package_registry');
      expect(text).toContain('recommended');
      expect(text).toContain('tags');

      console.log('Multi-field update result:', text);
    });

    it('should reject update with no changes', async () => {
      if (!testImplementationId) {
        console.log('Skipping - no test server available');
        return;
      }

      const result = await client.callTool('update_mcp_server', {
        implementation_id: testImplementationId,
      });

      // Should not error but should indicate no changes
      const text = result.content[0].text;
      expect(text).toContain('No changes provided');

      console.log('No changes result:', text);
    });

    it('should handle invalid implementation_id gracefully', async () => {
      const result = await client.callTool('update_mcp_server', {
        implementation_id: 999999999,
        short_description: 'Test',
      });

      expect(result.isError).toBeTruthy();
      const text = result.content[0].text;
      expect(text).toContain('Error');

      console.log('Invalid ID error:', text);
    });
  });

  describe('End-to-end workflow', () => {
    it('should complete list -> get -> update -> verify workflow', async () => {
      // 1. List servers to find one
      const listResult = await client.callTool('list_mcp_servers', {
        status: 'draft',
        limit: 1,
      });

      expect(listResult.isError).toBeFalsy();
      const listText = listResult.content[0].text;

      // Extract slug and implementation ID
      const slugMatch = listText.match(/slug: `([^`]+)`/);
      const implMatch = listText.match(/Implementation ID: (\d+)/);

      if (!slugMatch || !implMatch) {
        console.log('No draft servers available for e2e test');
        return;
      }

      const slug = slugMatch[1];
      const implId = parseInt(implMatch[1], 10);

      console.log(`E2E test using server: ${slug} (impl ID: ${implId})`);

      // 2. Get detailed info
      const getResult = await client.callTool('get_mcp_server', { slug });
      expect(getResult.isError).toBeFalsy();
      const getText = getResult.content[0].text;
      expect(getText).toContain(slug);

      // 3. Update the server
      const testMarker = `E2E test ${Date.now()}`;
      const updateResult = await client.callTool('update_mcp_server', {
        implementation_id: implId,
        internal_notes: testMarker,
      });
      expect(updateResult.isError).toBeFalsy();
      expect(updateResult.content[0].text).toContain('Successfully updated');

      // 4. Verify the update
      const verifyResult = await client.callTool('get_mcp_server', { slug });
      expect(verifyResult.isError).toBeFalsy();
      const verifyText = verifyResult.content[0].text;
      expect(verifyText).toContain(testMarker);

      console.log('E2E workflow completed successfully');
    });
  });
});
