import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit the real 1Password CLI via the MCP server.
 * These tests are NOT run in CI and require actual service account credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with OP_SERVICE_ACCOUNT_TOKEN
 * 2. Run: npm run test:manual
 *
 * Test outcomes:
 * - SUCCESS: Test passed, CLI responded as expected
 * - WARNING: Test passed but with unexpected behavior worth investigating
 * - FAILURE: Test failed, CLI error or unexpected response
 */

// Define test outcome types
type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

// Helper to report test outcomes with details
function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('1Password Manual Tests', () => {
  let client: TestMCPClient;
  let firstVaultId: string | null = null;

  beforeAll(async () => {
    if (!process.env.OP_SERVICE_ACCOUNT_TOKEN) {
      throw new Error('Manual tests require OP_SERVICE_ACCOUNT_TOKEN environment variable');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        OP_SERVICE_ACCOUNT_TOKEN: process.env.OP_SERVICE_ACCOUNT_TOKEN,
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('onepassword_list_vaults', () => {
    it('should list vaults with real CLI', async () => {
      const testName = 'list_vaults - real CLI call';

      try {
        const result = await client.callTool<{ type: string; text: string }>(
          'onepassword_list_vaults',
          {}
        );

        expect(result.isError).toBeFalsy();

        const vaults = JSON.parse(result.content[0].text);

        expect(vaults).toBeInstanceOf(Array);
        expect(vaults.length).toBeGreaterThan(0);
        expect(vaults[0]).toHaveProperty('id');
        expect(vaults[0]).toHaveProperty('name');

        // Store the first vault ID for subsequent tests
        firstVaultId = vaults[0].id;

        reportOutcome(testName, 'SUCCESS', `Found ${vaults.length} vault(s)`);
        console.log('Vaults:', vaults.map((v: { name: string }) => v.name).join(', '));
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('onepassword_list_items', () => {
    it('should list items in a vault with real CLI', async () => {
      const testName = 'list_items - real CLI call';

      if (!firstVaultId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no vault ID from previous test');
        return;
      }

      try {
        const result = await client.callTool<{ type: string; text: string }>(
          'onepassword_list_items',
          { vaultId: firstVaultId }
        );

        expect(result.isError).toBeFalsy();

        const items = JSON.parse(result.content[0].text);

        expect(items).toBeInstanceOf(Array);

        if (items.length > 0) {
          expect(items[0]).toHaveProperty('title');
          expect(items[0]).toHaveProperty('category');
        }

        reportOutcome(testName, 'SUCCESS', `Found ${items.length} item(s) in vault`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  describe('onepassword_get_item', () => {
    it('should get item details with real CLI', async () => {
      const testName = 'get_item - real CLI call';

      if (!firstVaultId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no vault ID from previous test');
        return;
      }

      try {
        // First list items to find one to get details for
        const listResult = await client.callTool<{ type: string; text: string }>(
          'onepassword_list_items',
          { vaultId: firstVaultId }
        );

        const items = JSON.parse(listResult.content[0].text);
        if (items.length === 0) {
          reportOutcome(testName, 'WARNING', 'No items available in vault to test');
          return;
        }

        const result = await client.callTool<{ type: string; text: string }>(
          'onepassword_get_item',
          { itemId: items[0].title, vaultId: firstVaultId }
        );

        expect(result.isError).toBeFalsy();

        const item = JSON.parse(result.content[0].text);

        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('vault');

        reportOutcome(testName, 'SUCCESS', `Retrieved item "${item.title}" (${item.category})`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });

  // Note: Create operations are skipped in manual tests to avoid polluting the vault
  // You can enable them manually if needed, but be cautious about cleanup
  describe.skip('onepassword_create_login', () => {
    it('should create a login with real CLI', async () => {
      const testName = 'create_login - real CLI call';

      if (!firstVaultId) {
        reportOutcome(testName, 'WARNING', 'Skipped - no vault ID from previous test');
        return;
      }

      try {
        const result = await client.callTool<{ type: string; text: string }>(
          'onepassword_create_login',
          {
            vaultId: firstVaultId,
            title: `Test Login ${Date.now()}`,
            username: 'testuser',
            password: 'testpass123',
            url: 'https://example.com',
            tags: ['test', 'manual'],
          }
        );

        expect(result.isError).toBeFalsy();

        const item = JSON.parse(result.content[0].text);

        expect(item).toHaveProperty('title');
        expect(item.category).toBe('LOGIN');

        reportOutcome(testName, 'SUCCESS', `Created login "${item.title}"`);
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });
  });
});
