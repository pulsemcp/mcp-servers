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
 *   - Playwright + Chromium installed (for flight search tests)
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
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '',
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
    it('should list all 7 tools', async () => {
      const result = await client.listTools();
      // listTools() returns { tools: [...] }
      const tools = result.tools;

      expect(Array.isArray(tools)).toBe(true);
      const toolNames = tools.map((t: { name: string }) => t.name).sort();
      expect(toolNames).toEqual([
        'get_explorer_count',
        'get_flight_recommendations',
        'get_hotel_recommendations',
        'get_search_history',
        'get_user_membership',
        'get_user_preferences',
        'search_flights',
      ]);

      console.log(`Listed ${tools.length} tools: ${toolNames.join(', ')}`);
    });
  });

  describe('Resources', () => {
    it('should list the config resource', async () => {
      const result = await client.listResources();
      // listResources() returns { resources: [...] }
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
      expect(config.server.version).toBe('0.1.0');
      expect(config.environment.POINTSYEAH_REFRESH_TOKEN).toBe('***configured***');
      expect(config.capabilities.tools).toBe(true);
      expect(config.capabilities.resources).toBe(true);

      console.log(`Playwright available: ${config.state.playwrightAvailable}`);
      console.log(`Server version: ${config.server.version}`);
    });
  });

  // =========================================================================
  // AUTHENTICATION (tested indirectly through API calls)
  // The first API call exercises the Cognito REFRESH_TOKEN_AUTH flow.
  // =========================================================================

  describe('Authentication - Cognito Token Refresh', () => {
    it('should successfully authenticate via Cognito and call an API', async () => {
      // get_user_membership is a simple authenticated GET.
      // The very first MCP tool call can fail with a transient "fetch failed" error
      // while the subprocess warms up and Cognito tokens are being refreshed.
      // Retry up to 3 times with increasing delays to handle startup latency.
      let result = await client.callTool('get_user_membership', {});

      for (let attempt = 1; attempt <= 2 && result.isError; attempt++) {
        const delay = attempt * 5000;
        console.log(
          `Auth attempt ${attempt} failed: ${result.content[0].text} (retrying in ${delay}ms)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        result = await client.callTool('get_user_membership', {});
      }

      if (result.isError) {
        console.log(`Auth call returned error: ${result.content[0].text}`);
      }
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      console.log(`Auth successful - membership response: ${JSON.stringify(parsed)}`);
    }, 60000);
  });

  // =========================================================================
  // READ-ONLY TOOLS - User API (plain HTTP, no Playwright needed)
  // =========================================================================

  describe('Read-Only Tools - User API', () => {
    it('get_search_history - should return search history', async () => {
      const result = await client.callTool('get_search_history', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      // PointsYeah API wraps responses in {code, success, data}
      expect(parsed).toBeDefined();
      // The response may be {code, success, data: [...]} or just [...]
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

    it('get_user_membership - should return membership info', async () => {
      const result = await client.callTool('get_user_membership', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      console.log(`Membership: ${JSON.stringify(parsed)}`);
    });

    it('get_user_preferences - should return user preferences', async () => {
      const result = await client.callTool('get_user_preferences', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      console.log(`User preferences keys: ${Object.keys(parsed.data).join(', ')}`);
    });
  });

  // =========================================================================
  // READ-ONLY TOOLS - Explorer API
  // =========================================================================

  describe('Read-Only Tools - Explorer API', () => {
    it('get_explorer_count - should return a count of available deals', async () => {
      const result = await client.callTool('get_explorer_count', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      expect(typeof parsed.data.count).toBe('number');
      expect(parsed.data.count).toBeGreaterThan(0);
      console.log(`Explorer deal count: ${parsed.data.count.toLocaleString()}`);
    });

    it('get_flight_recommendations - should return flight deals without filter', async () => {
      const result = await client.callTool('get_flight_recommendations', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();

      // Validate routes structure
      const routes = parsed.data.routes;
      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);

      const firstRoute = routes[0];
      expect(firstRoute.program).toBeDefined();
      expect(firstRoute.departure).toBeDefined();
      expect(firstRoute.arrival).toBeDefined();
      expect(typeof firstRoute.miles).toBe('number');

      console.log(`Flight recommendations: ${routes.length} routes`);
      console.log(
        `  First: ${firstRoute.departure.code} -> ${firstRoute.arrival.code} ` +
          `via ${firstRoute.program} for ${firstRoute.miles.toLocaleString()} miles`
      );
    });

    it('get_flight_recommendations - should handle departure filter parameter', async () => {
      const result = await client.callTool('get_flight_recommendations', {
        departure: 'SFO',
      });

      // The API may or may not support the departure filter via POST body -
      // either a successful response or an API error is acceptable
      if (result.isError) {
        const errorText = result.content[0].text;
        console.log(
          `Flight recs with departure filter returned error: ${errorText.substring(0, 200)}`
        );
        // This is acceptable - the departure param may not be supported by the API
        expect(errorText).toContain('Error');
      } else {
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed).toBeDefined();
        console.log(`Flight recs (SFO filter): ${JSON.stringify(parsed).substring(0, 300)}...`);
      }
    });

    it('get_hotel_recommendations - should return hotel deals', async () => {
      const result = await client.callTool('get_hotel_recommendations', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toBeDefined();
      expect(parsed.code).toBe(0);
      expect(parsed.success).toBe(true);
      expect(Array.isArray(parsed.data)).toBe(true);
      expect(parsed.data.length).toBeGreaterThan(0);

      const firstHotel = parsed.data[0];
      expect(firstHotel.property).toBeDefined();
      expect(firstHotel.property.name).toBeDefined();
      // points may be a number or an object depending on the hotel program
      expect(firstHotel.points).toBeDefined();

      console.log(`Hotel recommendations: ${parsed.data.length} properties`);
      const pointsStr =
        typeof firstHotel.points === 'number'
          ? `${firstHotel.points.toLocaleString()} points`
          : JSON.stringify(firstHotel.points);
      console.log(
        `  First: ${firstHotel.property.name} - ${pointsStr} (cash $${firstHotel.cash_price})`
      );
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
  // DIRECT CLIENT TESTS (bypass MCP protocol timeout for long operations)
  //
  // The MCP SDK has a 60-second request timeout. Flight searches take 1-5
  // minutes (Playwright + polling), so we test the client library directly.
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

  describe('Direct Client - Flight Search via Playwright', () => {
    it('should create a search task and poll for results', async () => {
      const { refreshCognitoTokens } =
        await import('../../shared/build/pointsyeah-client/lib/auth.js');
      const { createSearchTask } =
        await import('../../shared/build/pointsyeah-client/lib/search.js');

      // Step 1: Get tokens
      console.log('Step 1: Refreshing Cognito tokens...');
      const tokens = await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);
      console.log(`  Tokens obtained (expires ${new Date(tokens.expiresAt * 1000).toISOString()})`);

      // Step 2: Create Playwright browser deps
      console.log('Step 2: Launching Playwright browser...');
      const moduleName = 'playwright';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pw: any = await import(moduleName);
      const browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const playwrightDeps = {
        launchBrowser: async () => ({
          addCookies: async (
            cookies: Array<{ name: string; value: string; domain: string; path: string }>
          ) => {
            await context.addCookies(cookies);
          },
          newPage: async () => {
            const page = await context.newPage();
            return {
              goto: async (url: string, options?: { waitUntil?: string; timeout?: number }) => {
                await page.goto(url, {
                  waitUntil: (options?.waitUntil as 'domcontentloaded') || 'domcontentloaded',
                  timeout: options?.timeout || 60000,
                });
              },
              waitForResponse: async (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                predicate: (response: any) => boolean,
                options?: { timeout?: number }
              ) => {
                const response = await page.waitForResponse(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (resp: any) => predicate({ url: () => resp.url(), json: () => resp.json() }),
                  { timeout: options?.timeout || 60000 }
                );
                return { url: () => response.url(), json: () => response.json() };
              },
              close: async () => {
                await page.close();
              },
            };
          },
          close: async () => {
            await context.close();
            await browser.close();
          },
        }),
      };

      try {
        // Step 3: Create search task
        console.log('Step 3: Creating search task via Playwright...');
        const task = await createSearchTask(
          {
            departure: 'SFO',
            arrival: 'NRT',
            departDate: '2026-06-01',
            tripType: '1',
            adults: 1,
            children: 0,
            cabins: ['Economy', 'Business'],
          },
          tokens.accessToken,
          tokens.idToken,
          process.env.POINTSYEAH_REFRESH_TOKEN!,
          playwrightDeps
        );

        expect(task).toBeDefined();
        expect(task.task_id).toBeDefined();
        expect(typeof task.task_id).toBe('string');
        expect(task.total_sub_tasks).toBeGreaterThan(0);

        console.log(`  Task created: ${task.task_id}`);
        console.log(`  Total sub-tasks: ${task.total_sub_tasks}`);

        // Step 4: Poll for results using raw fetch to inspect actual response
        console.log('Step 4: Polling for results...');
        const POLL_INTERVAL_MS = 3000;
        const MAX_POLLS = 60; // Up to 3 minutes

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let lastResults: any = null;
        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

          const pollResponse = await fetch(
            'https://api2.pointsyeah.com/flight/search/fetch_result',
            {
              method: 'POST',
              headers: {
                Authorization: tokens.idToken,
                'Content-Type': 'application/json',
                Origin: 'https://www.pointsyeah.com',
                Referer: 'https://www.pointsyeah.com/',
              },
              body: JSON.stringify({ task_id: task.task_id }),
              signal: AbortSignal.timeout(30000),
            }
          );

          if (!pollResponse.ok) {
            console.log(`  Poll ${i + 1}: HTTP ${pollResponse.status} ${pollResponse.statusText}`);
            // If 404, the task may have expired - break early
            if (pollResponse.status === 404) {
              console.log('  Task not found - may have expired');
              break;
            }
            continue;
          }

          lastResults = await pollResponse.json();

          // Log raw response shape on first poll
          if (i === 0) {
            console.log(
              `  First poll raw response keys: ${JSON.stringify(Object.keys(lastResults))}`
            );
            if (lastResults.data) {
              console.log(`  data keys: ${JSON.stringify(Object.keys(lastResults.data))}`);
            }
          }

          const completed = lastResults.data?.completed_sub_tasks ?? '?';
          const total = lastResults.data?.total_sub_tasks ?? '?';
          const resultCount = lastResults.data?.result?.length ?? 0;

          console.log(`  Poll ${i + 1}: ${completed}/${total} sub-tasks, ${resultCount} results`);

          if (
            lastResults.data?.completed_sub_tasks != null &&
            lastResults.data?.total_sub_tasks != null &&
            lastResults.data.completed_sub_tasks >= lastResults.data.total_sub_tasks
          ) {
            break;
          }
        }

        expect(lastResults).not.toBeNull();
        console.log(`\n  Final response: ${JSON.stringify(lastResults).substring(0, 500)}...`);

        // Validate basic structure
        expect(lastResults.success).toBe(true);
        expect(lastResults.data).toBeDefined();
        expect(lastResults.data.result).toBeDefined();

        if (lastResults.data.result.length > 0) {
          const firstResult = lastResults.data.result[0];
          expect(firstResult.program).toBeDefined();
          expect(firstResult.routes).toBeDefined();
          expect(firstResult.routes.length).toBeGreaterThan(0);

          const firstRoute = firstResult.routes[0];
          expect(firstRoute.payment).toBeDefined();
          expect(typeof firstRoute.payment.miles).toBe('number');

          console.log(`  Search complete!`);
          console.log(
            `  Total results: ${lastResults.data.result.length} programs with availability`
          );
          console.log(
            `  Sample: ${firstResult.program} (${firstResult.code}) - ` +
              `${firstRoute.payment.miles.toLocaleString()} ${firstRoute.payment.unit} + ` +
              `$${firstRoute.payment.tax} tax`
          );
        } else {
          console.log('  No results found (all sub-tasks completed with 0 results)');
        }
      } finally {
        try {
          await context.close();
        } catch {
          /* already closed */
        }
        try {
          await browser.close();
        } catch {
          /* already closed */
        }
      }
    }, 300000); // 5 minute timeout
  });
});
