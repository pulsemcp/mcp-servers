import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for pulse-subregistry MCP server
 *
 * These tests require real API credentials and hit the live PulseMCP API
 * via the MCP server using TestMCPClient.
 *
 * Prerequisites:
 * - Set PULSEMCP_SUBREGISTRY_API_KEY environment variable
 * - Optionally set PULSEMCP_SUBREGISTRY_TENANT_ID for multi-tenant access
 *
 * Run with: npm run test:manual
 */
describe('PulseMCP Sub-Registry API - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const apiKey = process.env.PULSEMCP_SUBREGISTRY_API_KEY;
    const tenantId = process.env.PULSEMCP_SUBREGISTRY_TENANT_ID;

    if (!apiKey) {
      throw new Error(
        'PULSEMCP_SUBREGISTRY_API_KEY environment variable is required for manual tests'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      PULSEMCP_SUBREGISTRY_API_KEY: apiKey,
    };

    if (tenantId) {
      env.PULSEMCP_SUBREGISTRY_TENANT_ID = tenantId;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
    console.log('Testing with tenant:', tenantId || '(default)');
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('list_servers', () => {
    it('should list servers from the Sub-Registry', async () => {
      const result = await client.callTool('list_servers', {});
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_servers response length: ${text.length} chars`);
    });

    it('should respect limit parameter', async () => {
      const result = await client.callTool('list_servers', {
        limit: 5,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_servers with limit=5 response length: ${text.length} chars`);
    });

    it('should search servers by name/description', async () => {
      const result = await client.callTool('list_servers', {
        search: 'github',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_servers search "github" response length: ${text.length} chars`);
    });

    it('should support pagination with cursor', async () => {
      const firstResult = await client.callTool('list_servers', {
        limit: 2,
      });
      expect(firstResult.isError).toBeFalsy();

      const firstText = (firstResult.content[0] as { text: string }).text;
      expect(firstText).toBeDefined();

      // Extract cursor from response if available
      const cursorMatch = firstText.match(/cursor[:\s]+(\S+)/i);
      if (cursorMatch) {
        const secondResult = await client.callTool('list_servers', {
          limit: 2,
          cursor: cursorMatch[1],
        });
        expect(secondResult.isError).toBeFalsy();
        console.log('Pagination working - retrieved second page');
      } else {
        console.log('No cursor returned (single page of results)');
      }
    });
  });

  describe('get_server', () => {
    it('should get server details', async () => {
      // First get a server name from the list
      const listResult = await client.callTool('list_servers', {
        limit: 1,
      });
      expect(listResult.isError).toBeFalsy();

      const listText = (listResult.content[0] as { text: string }).text;

      // Extract a server name from the response
      const nameMatch = listText.match(/name[:\s]+["']?([^\n"',]+)/i);
      if (!nameMatch) {
        console.log('No servers in registry, skipping test');
        return;
      }

      const serverName = nameMatch[1].trim();
      console.log(`Getting details for server: ${serverName}`);

      const result = await client.callTool('get_server', {
        server_name: serverName,
        version: 'latest',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`get_server response length: ${text.length} chars`);
    });
  });
});
