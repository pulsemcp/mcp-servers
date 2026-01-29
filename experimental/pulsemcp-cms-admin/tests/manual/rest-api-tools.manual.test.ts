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
 * Manual Tests for New REST API Tools
 *
 * These tests hit the real PulseMCP API (staging) to verify:
 * - Unofficial Mirrors: CRUD operations
 * - Official Mirrors: Read operations
 * - Tenants: Read operations
 * - MCP JSONs: CRUD operations
 *
 * Required Environment Variables:
 * - PULSEMCP_ADMIN_API_KEY: API key for authentication
 * - PULSEMCP_ADMIN_API_URL: Optional staging URL override
 */

describe('REST API Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;

  // Track created resources for cleanup
  let createdUnofficialMirrorId: number | null = null;
  let createdMcpJsonId: number | null = null;

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
          process.env.PULSEMCP_ADMIN_API_URL || 'https://staging.pulsemcp.com',
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    // Cleanup: Delete created resources in reverse order
    if (createdMcpJsonId && client) {
      try {
        await client.callTool('delete_mcp_json', { id: createdMcpJsonId });
        console.log('Cleaned up MCP JSON:', createdMcpJsonId);
      } catch {
        console.log('Could not clean up MCP JSON:', createdMcpJsonId);
      }
    }

    if (createdUnofficialMirrorId && client) {
      try {
        await client.callTool('delete_unofficial_mirror', { id: createdUnofficialMirrorId });
        console.log('Cleaned up unofficial mirror:', createdUnofficialMirrorId);
      } catch {
        console.log('Could not clean up unofficial mirror:', createdUnofficialMirrorId);
      }
    }

    await client.disconnect();
  });

  describe('Tool Availability', () => {
    it('should list all new REST API tools', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);

      // Unofficial Mirrors
      expect(toolNames).toContain('get_unofficial_mirrors');
      expect(toolNames).toContain('get_unofficial_mirror');
      expect(toolNames).toContain('create_unofficial_mirror');
      expect(toolNames).toContain('update_unofficial_mirror');
      expect(toolNames).toContain('delete_unofficial_mirror');

      // Official Mirrors
      expect(toolNames).toContain('get_official_mirrors');
      expect(toolNames).toContain('get_official_mirror');

      // Tenants
      expect(toolNames).toContain('get_tenants');
      expect(toolNames).toContain('get_tenant');

      // MCP JSONs
      expect(toolNames).toContain('get_mcp_jsons');
      expect(toolNames).toContain('get_mcp_json');
      expect(toolNames).toContain('create_mcp_json');
      expect(toolNames).toContain('update_mcp_json');
      expect(toolNames).toContain('delete_mcp_json');

      console.log(
        'All new REST API tools available:',
        toolNames.filter((name) =>
          ['unofficial_mirror', 'official_mirror', 'tenant', 'mcp_json'].some((substr) =>
            name.includes(substr)
          )
        )
      );
    });
  });

  describe('Unofficial Mirrors', () => {
    it('get_unofficial_mirrors - should list unofficial mirrors', async () => {
      const result = await client.callTool('get_unofficial_mirrors', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Unofficial mirrors list:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ unofficial mirror/);
    });

    it('get_unofficial_mirrors - should support search', async () => {
      const result = await client.callTool('get_unofficial_mirrors', {
        q: 'test',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Unofficial mirrors search results:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ unofficial mirror/);
    });

    it('get_unofficial_mirrors - should support pagination', async () => {
      const result = await client.callTool('get_unofficial_mirrors', {
        limit: 5,
        offset: 0,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Unofficial mirrors page 1:', text.substring(0, 500));
    });

    it('get_unofficial_mirrors - should support mcp_server_slug convenience param', async () => {
      // Try filtering by a known MCP server slug
      const result = await client.callTool('get_unofficial_mirrors', {
        mcp_server_slug: 'filesystem',
        limit: 5,
      });

      // Don't fail if no results - just log
      const text = result.content[0].text;
      console.log('Unofficial mirrors by mcp_server_slug:', text.substring(0, 500));
    });

    it('get_unofficial_mirror - should support name lookup', async () => {
      // Try looking up by name instead of ID
      const result = await client.callTool('get_unofficial_mirror', {
        name: '@modelcontextprotocol/server-filesystem',
      });

      // Don't fail if not found - just log
      const text = result.content[0].text;
      console.log('Unofficial mirror by name:', text.substring(0, 500));
    });

    it('create_unofficial_mirror - should create with server_json (auto-wrapped)', async () => {
      const testName = `test-mirror-${Date.now()}`;
      const result = await client.callTool('create_unofficial_mirror', {
        name: testName,
        version: '1.0.0',
        server_json: {
          $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
          name: testName,
          title: 'Test MCP Server',
          version: '1.0.0',
          description: 'A test server for manual testing using server_json parameter',
        },
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Created unofficial mirror with server_json:', text);

      expect(text).toContain('Successfully created unofficial mirror');
      expect(text).toContain(testName);

      // Extract ID for cleanup
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        createdUnofficialMirrorId = parseInt(idMatch[1], 10);
        console.log('Created unofficial mirror ID:', createdUnofficialMirrorId);
      }
    });

    it('get_unofficial_mirror - should get a specific unofficial mirror', async () => {
      if (!createdUnofficialMirrorId) {
        console.log('Skipping - no unofficial mirror ID available');
        return;
      }

      const result = await client.callTool('get_unofficial_mirror', {
        id: createdUnofficialMirrorId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Unofficial mirror details:', text);

      expect(text).toContain('Unofficial Mirror Details');
      expect(text).toContain(`**ID:** ${createdUnofficialMirrorId}`);
    });

    it('update_unofficial_mirror - should update version', async () => {
      if (!createdUnofficialMirrorId) {
        console.log('Skipping - no unofficial mirror ID available');
        return;
      }

      const result = await client.callTool('update_unofficial_mirror', {
        id: createdUnofficialMirrorId,
        version: '1.0.1',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Updated unofficial mirror version:', text);

      expect(text).toContain('Successfully updated unofficial mirror');
    });

    it('update_unofficial_mirror - should update with server_json (auto-wrapped)', async () => {
      if (!createdUnofficialMirrorId) {
        console.log('Skipping - no unofficial mirror ID available');
        return;
      }

      const result = await client.callTool('update_unofficial_mirror', {
        id: createdUnofficialMirrorId,
        server_json: {
          $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
          name: `test-mirror-updated-${Date.now()}`,
          title: 'Updated Test MCP Server',
          version: '1.0.2',
          description: 'Updated via server_json parameter',
        },
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Updated unofficial mirror with server_json:', text);

      expect(text).toContain('Successfully updated unofficial mirror');
      expect(text).toContain('jsonb_data');
    });

    it('delete_unofficial_mirror - should delete an unofficial mirror', async () => {
      if (!createdUnofficialMirrorId) {
        console.log('Skipping - no unofficial mirror ID available');
        return;
      }

      const result = await client.callTool('delete_unofficial_mirror', {
        id: createdUnofficialMirrorId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Deleted unofficial mirror:', text);

      expect(text).toContain('Successfully deleted unofficial mirror');

      // Mark as cleaned up
      createdUnofficialMirrorId = null;
    });
  });

  describe('Official Mirrors', () => {
    let existingOfficialMirrorId: number | null = null;

    it('get_official_mirrors - should list official mirrors', async () => {
      const result = await client.callTool('get_official_mirrors', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Official mirrors list:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ official mirror/);

      // Extract an ID for subsequent tests
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        existingOfficialMirrorId = parseInt(idMatch[1], 10);
      }
    });

    it('get_official_mirrors - should support status filter', async () => {
      const result = await client.callTool('get_official_mirrors', {
        status: 'pending',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Official mirrors (pending):', text.substring(0, 500));
    });

    it('get_official_mirrors - should support processed filter', async () => {
      const result = await client.callTool('get_official_mirrors', {
        processed: true,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Official mirrors (processed):', text.substring(0, 500));
    });

    it('get_official_mirror - should get a specific official mirror', async () => {
      if (!existingOfficialMirrorId) {
        console.log('Skipping - no official mirror ID available');
        return;
      }

      const result = await client.callTool('get_official_mirror', {
        id: existingOfficialMirrorId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Official mirror details:', text);

      expect(text).toContain('Official Mirror Details');
    });
  });

  describe('Tenants', () => {
    let existingTenantId: number | null = null;

    it('get_tenants - should list tenants', async () => {
      const result = await client.callTool('get_tenants', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Tenants list:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ tenant/);

      // Extract an ID for subsequent tests
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        existingTenantId = parseInt(idMatch[1], 10);
      }
    });

    it('get_tenants - should support search', async () => {
      const result = await client.callTool('get_tenants', {
        q: 'admin',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Tenants search results:', text.substring(0, 500));
    });

    it('get_tenants - should support is_admin filter', async () => {
      const result = await client.callTool('get_tenants', {
        is_admin: true,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Admin tenants:', text.substring(0, 500));
    });

    it('get_tenant - should get a specific tenant by ID', async () => {
      if (!existingTenantId) {
        console.log('Skipping - no tenant ID available');
        return;
      }

      const result = await client.callTool('get_tenant', {
        id_or_slug: existingTenantId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Tenant details:', text);

      expect(text).toContain('Tenant Details');
    });

    it('get_tenant - should get a tenant by slug', async () => {
      // Try fetching a known tenant slug - skip if not found
      const result = await client.callTool('get_tenant', {
        id_or_slug: 'pulsemcp',
      });

      // Don't fail if tenant not found - just log
      const text = result.content[0].text;
      console.log('Tenant by slug result:', text.substring(0, 300));
    });
  });

  describe('MCP JSONs', () => {
    let existingMirrorId: number | null = null;

    // First, get an unofficial mirror ID to use for MCP JSON tests
    it('setup - get an unofficial mirror for MCP JSON tests', async () => {
      const result = await client.callTool('get_unofficial_mirrors', { limit: 1 });

      const text = result.content[0].text;
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        existingMirrorId = parseInt(idMatch[1], 10);
        console.log('Using unofficial mirror ID for MCP JSON tests:', existingMirrorId);
      }
    });

    it('get_mcp_jsons - should list MCP JSONs', async () => {
      const result = await client.callTool('get_mcp_jsons', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('MCP JSONs list:', text.substring(0, 500));

      expect(text).toMatch(/Found \d+ MCP JSON/);
    });

    it('get_mcp_jsons - should support unofficial_mirror_id filter', async () => {
      if (!existingMirrorId) {
        console.log('Skipping - no mirror ID available');
        return;
      }

      const result = await client.callTool('get_mcp_jsons', {
        unofficial_mirror_id: existingMirrorId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('MCP JSONs for mirror:', text.substring(0, 500));
    });

    it('get_mcp_jsons - should support unofficial_mirror_name convenience param', async () => {
      // Try filtering by unofficial mirror name
      const result = await client.callTool('get_mcp_jsons', {
        unofficial_mirror_name: '@modelcontextprotocol/server-filesystem',
      });

      // Don't fail if no results - just log
      const text = result.content[0].text;
      console.log('MCP JSONs by unofficial_mirror_name:', text.substring(0, 500));
    });

    it('get_mcp_jsons - should support mcp_server_slug convenience param', async () => {
      // Try filtering by MCP server slug - gets all MCP JSONs for all unofficial mirrors linked to this server
      const result = await client.callTool('get_mcp_jsons', {
        mcp_server_slug: 'filesystem',
      });

      // Don't fail if no results - just log
      const text = result.content[0].text;
      console.log('MCP JSONs by mcp_server_slug:', text.substring(0, 500));
    });

    it('create_mcp_json - should create a new MCP JSON', async () => {
      if (!existingMirrorId) {
        console.log('Skipping - no mirror ID available');
        return;
      }

      const result = await client.callTool('create_mcp_json', {
        mcp_servers_unofficial_mirror_id: existingMirrorId,
        title: `Test Config ${Date.now()}`,
        value: {
          command: 'npx',
          args: ['-y', '@test/mcp-server'],
        },
        description: 'Created via manual test',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Created MCP JSON:', text);

      expect(text).toContain('Successfully created MCP JSON');

      // Extract ID for cleanup
      const idMatch = text.match(/\*\*ID:\*\* (\d+)/);
      if (idMatch) {
        createdMcpJsonId = parseInt(idMatch[1], 10);
        console.log('Created MCP JSON ID:', createdMcpJsonId);
      }
    });

    it('get_mcp_json - should get a specific MCP JSON', async () => {
      if (!createdMcpJsonId) {
        console.log('Skipping - no MCP JSON ID available');
        return;
      }

      const result = await client.callTool('get_mcp_json', {
        id: createdMcpJsonId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('MCP JSON details:', text);

      expect(text).toContain('MCP JSON Details');
    });

    it('update_mcp_json - should update an MCP JSON', async () => {
      if (!createdMcpJsonId) {
        console.log('Skipping - no MCP JSON ID available');
        return;
      }

      const result = await client.callTool('update_mcp_json', {
        id: createdMcpJsonId,
        title: 'Updated Test Config',
        description: 'Updated via manual test',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Updated MCP JSON:', text);

      expect(text).toContain('Successfully updated MCP JSON');
    });

    it('delete_mcp_json - should delete an MCP JSON', async () => {
      if (!createdMcpJsonId) {
        console.log('Skipping - no MCP JSON ID available');
        return;
      }

      const result = await client.callTool('delete_mcp_json', {
        id: createdMcpJsonId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;
      console.log('Deleted MCP JSON:', text);

      expect(text).toContain('Successfully deleted MCP JSON');

      // Mark as cleaned up
      createdMcpJsonId = null;
    });
  });
});
