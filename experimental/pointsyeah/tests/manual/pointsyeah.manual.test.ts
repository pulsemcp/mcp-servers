import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for PointsYeah MCP Server
 *
 * These tests hit the REAL PointsYeah API and require:
 *   - POINTSYEAH_REFRESH_TOKEN environment variable (via .env file)
 *
 * Run with: npm run test:manual
 */
describe('PointsYeah MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    if (!process.env.POINTSYEAH_REFRESH_TOKEN) {
      throw new Error(
        'Manual tests require POINTSYEAH_REFRESH_TOKEN environment variable. ' +
          'Create a .env file in the pointsyeah directory with your token.'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        POINTSYEAH_REFRESH_TOKEN: process.env.POINTSYEAH_REFRESH_TOKEN,
      },
      debug: false,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  // =========================================================================
  // TOOL & RESOURCE DISCOVERY
  // =========================================================================

  describe('Tool Discovery', () => {
    it('should list all 2 tools', async () => {
      const result = await client.listTools();
      const tools = result.tools;

      expect(Array.isArray(tools)).toBe(true);
      const toolNames = tools.map((t: { name: string }) => t.name).sort();
      expect(toolNames).toEqual(['get_search_history', 'search_flights']);

      console.log(`Listed ${tools.length} tools: ${toolNames.join(', ')}`);
    });
  });

  describe('Resources', () => {
    it('should list the config resource', async () => {
      const result = await client.listResources();
      const resources = result.resources;

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThanOrEqual(1);
      const configResource = resources.find(
        (r: { uri: string }) => r.uri === 'pointsyeah://config'
      );
      expect(configResource).toBeDefined();
      expect(configResource.name).toBe('Server Configuration');

      console.log(`Listed ${resources.length} resource(s)`);
    });

    it('should read config resource with correct state', async () => {
      const result = await client.readResource('pointsyeah://config');

      expect(result.contents).toHaveLength(1);
      const config = JSON.parse(result.contents[0].text);

      expect(config.server.name).toBe('pointsyeah-mcp-server');
      expect(config.environment.POINTSYEAH_REFRESH_TOKEN).toBe('***configured***');
      expect(config.capabilities.tools).toBe(true);
      expect(config.capabilities.resources).toBe(true);

      console.log(`Server version: ${config.server.version}`);
    });
  });

  // =========================================================================
  // AUTHENTICATION (tested indirectly through API calls)
  // The first API call exercises the Cognito REFRESH_TOKEN_AUTH flow.
  // =========================================================================

  describe('Authentication - Cognito Token Refresh', () => {
    it('should successfully authenticate via Cognito and call an API', async () => {
      // get_search_history is a simple authenticated GET.
      // The very first MCP tool call can fail with a transient "fetch failed" error
      // while the subprocess warms up and Cognito tokens are being refreshed.
      // Retry up to 3 times with increasing delays to handle startup latency.
      let result = await client.callTool('get_search_history', {});

      for (let attempt = 1; attempt <= 2 && result.isError; attempt++) {
        const delay = attempt * 5000;
        console.log(
          `Auth attempt ${attempt} failed: ${result.content[0].text} (retrying in ${delay}ms)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        result = await client.callTool('get_search_history', {});
      }

      if (result.isError) {
        console.log(`Auth call returned error: ${result.content[0].text}`);
      }
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
      console.log(
        `Auth successful - search history response: ${JSON.stringify(parsed).substring(0, 300)}`
      );
    }, 60000);
  });

  // =========================================================================
  // READ-ONLY TOOLS
  // =========================================================================

  describe('Read-Only Tools', () => {
    it('get_search_history - should return search history', async () => {
      const result = await client.callTool('get_search_history', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      const history = Array.isArray(parsed) ? parsed : parsed.data;
      if (history && Array.isArray(history)) {
        console.log(`Search history: ${history.length} entries`);
        if (history.length > 0) {
          console.log(`  Most recent: ${JSON.stringify(history[0]).substring(0, 200)}...`);
        }
      } else {
        console.log(`Search history response: ${JSON.stringify(parsed).substring(0, 300)}`);
      }
    });
  });

  // =========================================================================
  // FLIGHT SEARCH - Input Validation (via MCP)
  // =========================================================================

  describe('Flight Search - Input Validation', () => {
    it('search_flights - should reject round-trip without returnDate', async () => {
      const result = await client.callTool('search_flights', {
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-06-01',
        // No returnDate with default tripType=2 (round-trip)
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('returnDate is required');
      console.log('Round-trip validation working correctly');
    });

    it('search_flights - should reject invalid date format', async () => {
      const result = await client.callTool('search_flights', {
        departure: 'SFO',
        arrival: 'NYC',
        departDate: 'not-a-date',
      });

      expect(result.isError).toBe(true);
      console.log(`Invalid date error: ${result.content[0].text.substring(0, 200)}`);
    });

    it('search_flights - should reject missing required fields', async () => {
      const result = await client.callTool('search_flights', {});

      expect(result.isError).toBe(true);
      console.log(`Missing fields error: ${result.content[0].text.substring(0, 200)}`);
    });
  });

  // =========================================================================
  // DIRECT CLIENT TESTS
  // =========================================================================

  describe('Direct Client - Cognito Auth', () => {
    it('should refresh Cognito tokens with the real refresh token', async () => {
      const { refreshCognitoTokens } =
        await import('../../shared/build/pointsyeah-client/lib/auth.js');

      const tokens = await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);

      expect(tokens).toBeDefined();
      expect(tokens.idToken).toBeDefined();
      expect(typeof tokens.idToken).toBe('string');
      expect(tokens.idToken.length).toBeGreaterThan(100);
      expect(tokens.accessToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(tokens.expiresAt).toBeDefined();
      expect(typeof tokens.expiresAt).toBe('number');
      expect(tokens.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      console.log(`Cognito tokens refreshed successfully`);
      console.log(`  ID token length: ${tokens.idToken.length}`);
      console.log(`  Access token length: ${tokens.accessToken.length}`);
      console.log(`  Expires at: ${new Date(tokens.expiresAt * 1000).toISOString()}`);
    });
  });

  describe('Direct Client - Explorer Search API', () => {
    it('should search for flights via explorer API and fetch details', async () => {
      const { refreshCognitoTokens } =
        await import('../../shared/build/pointsyeah-client/lib/auth.js');
      const { explorerSearch, fetchFlightDetail } =
        await import('../../shared/build/pointsyeah-client/lib/explorer-search.js');

      // Step 1: Get tokens
      console.log('Step 1: Refreshing Cognito tokens...');
      const tokens = await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);
      console.log(`  Tokens obtained (expires ${new Date(tokens.expiresAt * 1000).toISOString()})`);

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
        console.log(`    Cabin: ${firstResult.cabin}, Stops: ${firstResult.stops}`);

        // Step 3: Fetch detail for first result
        console.log('Step 3: Fetching flight detail...');
        const detail = await fetchFlightDetail(firstResult.detail_url);

        expect(detail).toBeDefined();
        expect(detail.program).toBeDefined();
        expect(detail.routes).toBeDefined();
        expect(detail.routes.length).toBeGreaterThan(0);

        console.log(`  Detail for: ${detail.program} (${detail.code})`);
        console.log(`  Routes: ${detail.routes.length}`);

        const firstRoute = detail.routes[0];
        console.log(`  First route:`);
        console.log(
          `    ${firstRoute.payment.miles.toLocaleString()} ${firstRoute.payment.unit} + $${firstRoute.payment.tax} tax`
        );
        console.log(`    Segments: ${firstRoute.segments.length}`);

        for (const seg of firstRoute.segments) {
          console.log(
            `      ${seg.flight.number}: ${seg.departure_info.airport.airport_code} -> ${seg.arrival_info.airport.airport_code} [${seg.cabin}]`
          );
        }

        if (firstRoute.transfer && firstRoute.transfer.length > 0) {
          console.log(
            `    Transfers: ${firstRoute.transfer.map((t) => `${t.bank}: ${t.points.toLocaleString()} pts`).join(', ')}`
          );
        }
      } else {
        console.log('  No results found for this route/date');
      }
    }, 60000);
  });
});
