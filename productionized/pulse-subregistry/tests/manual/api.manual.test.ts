/**
 * Manual tests for pulse-subregistry MCP server
 *
 * These tests require real API credentials and hit the live PulseMCP API.
 * Run with: npm run test:manual
 *
 * Prerequisites:
 * - Set PULSEMCP_SUBREGISTRY_API_KEY environment variable
 * - Optionally set PULSEMCP_SUBREGISTRY_TENANT_ID for multi-tenant access
 */

import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { PulseSubregistryClient } from '../../shared/src/client.js';

// Load environment variables from .env file
dotenv.config();

describe('PulseMCP Sub-Registry API - Manual Tests', () => {
  let client: PulseSubregistryClient;

  beforeAll(() => {
    const apiKey = process.env.PULSEMCP_SUBREGISTRY_API_KEY;
    const tenantId = process.env.PULSEMCP_SUBREGISTRY_TENANT_ID;

    if (!apiKey) {
      throw new Error(
        'PULSEMCP_SUBREGISTRY_API_KEY environment variable is required for manual tests'
      );
    }

    client = new PulseSubregistryClient({
      apiKey,
      tenantId,
    });

    console.log('Testing with tenant:', tenantId || '(default)');
  });

  describe('list_servers', () => {
    it('should list servers from the Sub-Registry', async () => {
      const response = await client.listServers();

      console.log(`Found ${response.servers.length} servers`);
      console.log('Metadata:', response.metadata);

      expect(response.servers).toBeDefined();
      expect(Array.isArray(response.servers)).toBe(true);
      expect(response.metadata).toBeDefined();
      expect(typeof response.metadata.count).toBe('number');

      // Log first few servers
      response.servers.slice(0, 3).forEach((server) => {
        console.log(`- ${server.name}: ${server.description?.slice(0, 50)}...`);
      });
    });

    it('should respect limit parameter', async () => {
      const response = await client.listServers({ limit: 5 });

      console.log(`Requested limit 5, got ${response.servers.length} servers`);

      expect(response.servers.length).toBeLessThanOrEqual(5);
    });

    it('should search servers by name/description', async () => {
      const response = await client.listServers({ search: 'github' });

      console.log(`Search "github" returned ${response.servers.length} results`);
      response.servers.forEach((server) => {
        console.log(`- ${server.name}`);
      });

      // Search results should have some relevance to the search term
      // (this is a soft check since API behavior may vary)
      expect(response.servers).toBeDefined();
    });

    it('should support pagination with cursor', async () => {
      // Get first page with small limit
      const firstPage = await client.listServers({ limit: 2 });

      console.log(`First page: ${firstPage.servers.length} servers`);
      console.log('Next cursor:', firstPage.metadata.nextCursor);

      if (firstPage.metadata.nextCursor) {
        const secondPage = await client.listServers({
          limit: 2,
          cursor: firstPage.metadata.nextCursor,
        });

        console.log(`Second page: ${secondPage.servers.length} servers`);

        expect(secondPage.servers).toBeDefined();

        // Second page servers should be different from first page
        if (secondPage.servers.length > 0 && firstPage.servers.length > 0) {
          const firstPageNames = firstPage.servers.map((s) => s.name);
          const secondPageNames = secondPage.servers.map((s) => s.name);
          const overlap = secondPageNames.filter((name) => firstPageNames.includes(name));
          console.log('Pages overlap:', overlap.length > 0 ? overlap : 'none (as expected)');
        }
      } else {
        console.log('No more pages available (no cursor returned)');
      }
    });
  });

  describe('get_server', () => {
    it('should get server details with latest version', async () => {
      // First get a server name from the list
      const listResponse = await client.listServers({ limit: 1 });

      if (listResponse.servers.length === 0) {
        console.log('No servers in registry, skipping test');
        return;
      }

      const serverName = listResponse.servers[0].name;
      console.log(`Getting details for server: ${serverName}`);

      const response = await client.getServer({
        serverName,
        version: 'latest',
      });

      console.log('Server details:', JSON.stringify(response.server, null, 2));

      expect(response.server).toBeDefined();
      expect(response.server.name).toBe(serverName);
    });

    it('should handle server not found error', async () => {
      const nonExistentServer = 'definitely-not-a-real-server-12345';

      try {
        await client.getServer({
          serverName: nonExistentServer,
          version: 'latest',
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        console.log(
          'Expected error for non-existent server:',
          error instanceof Error ? error.message : error
        );
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Make several rapid requests to potentially trigger rate limiting
      const requests = Array(5)
        .fill(null)
        .map(() => client.listServers({ limit: 1 }));

      try {
        const results = await Promise.all(requests);
        console.log(`Made ${results.length} parallel requests successfully`);
        results.forEach((r) => {
          expect(r.servers).toBeDefined();
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
          console.log('Rate limiting detected (expected behavior)');
          expect(error.message).toContain('Rate limit');
        } else {
          throw error;
        }
      }
    });
  });
});
