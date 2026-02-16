import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hasToken = !!process.env.POINTSYEAH_REFRESH_TOKEN;

/**
 * Manual tests for PointsYeah MCP Server
 *
 * These tests verify the dynamic authentication flow:
 *   1. Server starts with only set_refresh_token tool (no env token)
 *   2. After providing a valid token, flight search tools become available
 *   3. If token is revoked, server switches back to set_refresh_token
 *
 * Unauthenticated tests always run (no token needed).
 * Authenticated and Direct Client tests require POINTSYEAH_REFRESH_TOKEN in .env.
 *
 * Run with: npm run test:manual
 */
describe('PointsYeah MCP Server - Manual Tests', () => {
  // =========================================================================
  // UNAUTHENTICATED MODE (no env token)
  // =========================================================================

  describe('Unauthenticated Mode', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(__dirname, '../../local/build/index.js');

      // Start server WITHOUT a refresh token
      client = new TestMCPClient({
        serverPath,
        env: {},
        debug: false,
      });

      await client.connect();
    }, 30000);

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    it('should only expose set_refresh_token tool when unauthenticated', async () => {
      const result = await client.listTools();
      const tools = result.tools;
      const toolNames = tools.map((t: { name: string }) => t.name);

      expect(toolNames).toEqual(['set_refresh_token']);
      expect(toolNames).not.toContain('search_flights');
      expect(toolNames).not.toContain('get_search_history');

      console.log(`Unauthenticated tools: ${toolNames.join(', ')}`);
    });

    it('set_refresh_token should include instructions for obtaining token', async () => {
      const result = await client.listTools();
      const tool = result.tools.find((t: { name: string }) => t.name === 'set_refresh_token');

      expect(tool).toBeDefined();
      expect(tool.description).toContain('document.cookie');
      expect(tool.description).toContain('pointsyeah.com');
      console.log('set_refresh_token tool has proper instructions');
    });

    it('should reject invalid/short tokens', async () => {
      const result = await client.callTool('set_refresh_token', {
        refreshToken: 'too-short',
      });

      expect(result.isError).toBe(true);
      console.log('Short token rejected correctly');
    });

    it('should show config resource with needs_token status', async () => {
      const result = await client.readResource('pointsyeah://config');

      expect(result.contents).toHaveLength(1);
      const config = JSON.parse(result.contents[0].text);

      expect(config.server.name).toBe('pointsyeah-mcp-server');
      expect(config.authentication.status).toBe('needs_token');

      console.log(`Config auth status: ${config.authentication.status}`);
    });
  });

  // =========================================================================
  // AUTHENTICATED MODE (with env token)
  // =========================================================================

  describe('Authenticated Mode', () => {
    let client: TestMCPClient;
    let tokenWorks = false;

    beforeAll(async () => {
      if (!hasToken) return;

      const serverPath = path.join(__dirname, '../../local/build/index.js');

      // Start server WITH a refresh token
      client = new TestMCPClient({
        serverPath,
        env: {
          POINTSYEAH_REFRESH_TOKEN: process.env.POINTSYEAH_REFRESH_TOKEN!,
        },
        debug: false,
      });

      await client.connect();

      // Check if the token actually works by looking at tool list
      const result = await client.listTools();
      const toolNames = result.tools.map((t: { name: string }) => t.name);
      tokenWorks = toolNames.includes('search_flights');

      if (!tokenWorks) {
        console.log(
          'Token is expired/revoked — server started in auth mode. ' +
            'Only unauthenticated tests will run.'
        );
      }
    }, 30000);

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    it('should expose flight search tools or show set_refresh_token for expired token', async () => {
      if (!hasToken) {
        console.log('Skipped: no POINTSYEAH_REFRESH_TOKEN');
        return;
      }
      if (!tokenWorks) {
        // Token is revoked — server should show set_refresh_token instead
        const result = await client.listTools();
        const toolNames = result.tools.map((t: { name: string }) => t.name);
        expect(toolNames).toContain('set_refresh_token');
        console.log('Token expired — server correctly shows set_refresh_token');
        return;
      }

      const result = await client.listTools();
      const toolNames = result.tools.map((t: { name: string }) => t.name).sort();

      expect(toolNames).toEqual(['get_search_history', 'search_flights']);
      console.log(`Authenticated tools: ${toolNames.join(', ')}`);
    });

    it.skipIf(!hasToken || !tokenWorks)(
      'should show config resource with authenticated status',
      async () => {
        const result = await client.readResource('pointsyeah://config');
        const config = JSON.parse(result.contents[0].text);

        expect(config.authentication.status).toBe('authenticated');
        console.log(`Config auth status: ${config.authentication.status}`);
      }
    );

    it.skipIf(!hasToken || !tokenWorks)(
      'get_search_history - should return search history',
      async () => {
        const result = await client.callTool('get_search_history', {});

        expect(result.isError).toBeFalsy();
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toBeDefined();
        console.log(`Search history response: ${JSON.stringify(parsed).substring(0, 300)}`);
      }
    );

    it.skipIf(!hasToken || !tokenWorks)(
      'search_flights - should reject round-trip without returnDate',
      async () => {
        const result = await client.callTool('search_flights', {
          departure: 'SFO',
          arrival: 'NYC',
          departDate: '2026-06-01',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('returnDate is required');
        console.log('Round-trip validation working correctly');
      }
    );
  });

  // =========================================================================
  // DIRECT CLIENT TESTS
  // =========================================================================

  describe('Direct Client - Cognito Auth', () => {
    it.skipIf(!hasToken)('should refresh Cognito tokens with the real refresh token', async () => {
      const { refreshCognitoTokens } =
        await import('../../shared/build/pointsyeah-client/lib/auth.js');

      const tokens = await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);

      expect(tokens).toBeDefined();
      expect(tokens.idToken).toBeDefined();
      expect(typeof tokens.idToken).toBe('string');
      expect(tokens.idToken.length).toBeGreaterThan(100);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      console.log(`Cognito tokens refreshed successfully`);
      console.log(`  ID token length: ${tokens.idToken.length}`);
      console.log(`  Expires at: ${new Date(tokens.expiresAt * 1000).toISOString()}`);
    });
  });

  describe('Direct Client - Explorer Search API', () => {
    it.skipIf(!hasToken)(
      'should search for flights via explorer API and fetch details',
      async () => {
        const { refreshCognitoTokens } =
          await import('../../shared/build/pointsyeah-client/lib/auth.js');
        const { explorerSearch, fetchFlightDetail } =
          await import('../../shared/build/pointsyeah-client/lib/explorer-search.js');

        console.log('Step 1: Refreshing Cognito tokens...');
        const tokens = await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);
        console.log(
          `  Tokens obtained (expires ${new Date(tokens.expiresAt * 1000).toISOString()})`
        );

        // Step 2: Search via explorer API
        console.log('Step 2: Searching via explorer API...');
        const searchResults = await explorerSearch(
          {
            departure: 'SFO',
            arrival: 'NRT',
            departDate: '2026-06-01',
            tripType: '1',
            adults: 1,
            children: 0,
            cabins: ['Economy', 'Business'],
          },
          tokens.idToken
        );

        expect(searchResults).toBeDefined();
        expect(typeof searchResults.total).toBe('number');
        expect(Array.isArray(searchResults.results)).toBe(true);

        console.log(`  Total results in database: ${searchResults.total}`);
        console.log(`  Results returned: ${searchResults.results.length}`);

        if (searchResults.results.length > 0) {
          const firstResult = searchResults.results[0];
          console.log(`  First result: ${firstResult.program}`);
          console.log(`    ${firstResult.departure.code} -> ${firstResult.arrival.code}`);
          console.log(`    ${firstResult.miles.toLocaleString()} miles + $${firstResult.tax} tax`);

          // Step 3: Fetch detail for first result
          console.log('Step 3: Fetching flight detail...');
          const detail = await fetchFlightDetail(firstResult.detail_url);

          expect(detail).toBeDefined();
          expect(detail.program).toBeDefined();
          expect(detail.routes).toBeDefined();
          expect(detail.routes.length).toBeGreaterThan(0);

          console.log(`  Detail for: ${detail.program} (${detail.code})`);
          console.log(`  Routes: ${detail.routes.length}`);
        } else {
          console.log('  No results found for this route/date');
        }
      },
      60000
    );
  });
});
