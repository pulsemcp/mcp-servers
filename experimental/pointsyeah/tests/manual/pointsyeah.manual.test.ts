import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hasToken = !!process.env.POINTSYEAH_REFRESH_TOKEN;

/**
 * Validate the token upfront by attempting a Cognito refresh.
 * This determines whether auth-dependent tests should run or skip.
 */
let tokenWorks = false;
let tokenValidated = false;
async function validateToken(): Promise<void> {
  if (!hasToken) {
    tokenValidated = true;
    return;
  }
  try {
    const { refreshCognitoTokens } =
      await import('../../shared/build/pointsyeah-client/lib/auth.js');
    await refreshCognitoTokens(process.env.POINTSYEAH_REFRESH_TOKEN!);
    tokenWorks = true;
    console.log('Token validation: token is valid');
  } catch {
    tokenWorks = false;
    console.log('Token validation: token is expired/revoked');
  }
  tokenValidated = true;
}

function skipUnlessTokenWorks(ctx: { skip: () => void }) {
  if (!tokenValidated) throw new Error('Token validation not yet complete');
  if (!hasToken || !tokenWorks) ctx.skip();
}

function skipUnlessHasToken(ctx: { skip: () => void }) {
  if (!tokenValidated) throw new Error('Token validation not yet complete');
  if (!hasToken) ctx.skip();
}

/**
 * Manual tests for PointsYeah MCP Server
 *
 * All tools are always visible (search_flights, get_search_history, set_refresh_token).
 * Auth-requiring tools return an error when not authenticated, directing users
 * to call set_refresh_token first.
 *
 * Run with: npm run test:manual
 */
describe('PointsYeah MCP Server - Manual Tests', () => {
  beforeAll(async () => {
    await validateToken();
  }, 30000);

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

    it('should expose all tools even when unauthenticated', async () => {
      const result = await client.listTools();
      const tools = result.tools;
      const toolNames = tools.map((t: { name: string }) => t.name);

      expect(toolNames).toContain('search_flights');
      expect(toolNames).toContain('get_search_history');
      expect(toolNames).toContain('set_refresh_token');
      expect(tools.length).toBe(3);

      console.log(`Unauthenticated tools: ${toolNames.join(', ')}`);
    });

    it('search_flights should return auth error when unauthenticated', async () => {
      const result = await client.callTool('search_flights', {
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-06-01',
        tripType: '1',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Authentication required');
      expect(result.content[0].text).toContain('set_refresh_token');
      console.log('search_flights correctly returns auth error when unauthenticated');
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
  // Tests verify behavior when the server starts with a token.
  // =========================================================================

  describe('Authenticated Mode', () => {
    let client: TestMCPClient;

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
    }, 30000);

    afterAll(async () => {
      if (client) {
        await client.disconnect();
      }
    });

    it('should expose all tools regardless of auth state', async (ctx) => {
      skipUnlessHasToken(ctx);

      const result = await client.listTools();
      const toolNames = result.tools.map((t: { name: string }) => t.name);

      expect(toolNames).toContain('search_flights');
      expect(toolNames).toContain('get_search_history');
      expect(toolNames).toContain('set_refresh_token');
      console.log(`Tools with token: ${toolNames.join(', ')}`);
    });

    it('should show config resource with authenticated status', async (ctx) => {
      skipUnlessTokenWorks(ctx);

      const result = await client.readResource('pointsyeah://config');
      const config = JSON.parse(result.contents[0].text);

      expect(config.authentication.status).toBe('authenticated');
      console.log(`Config auth status: ${config.authentication.status}`);
    });

    it('get_search_history - should return search history', async (ctx) => {
      skipUnlessTokenWorks(ctx);

      const result = await client.callTool('get_search_history', {});

      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
      console.log(`Search history response: ${JSON.stringify(parsed).substring(0, 300)}`);
    });

    it('search_flights - should reject round-trip without returnDate', async (ctx) => {
      skipUnlessTokenWorks(ctx);

      const result = await client.callTool('search_flights', {
        departure: 'SFO',
        arrival: 'NYC',
        departDate: '2026-06-01',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('returnDate is required');
      console.log('Round-trip validation working correctly');
    });
  });

  // =========================================================================
  // DIRECT CLIENT TESTS
  // These test the underlying client libraries directly (no MCP server).
  // Require a valid (non-revoked) token.
  // =========================================================================

  describe('Direct Client - Cognito Auth', () => {
    it('should refresh Cognito tokens with the real refresh token', async (ctx) => {
      skipUnlessTokenWorks(ctx);

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
});
