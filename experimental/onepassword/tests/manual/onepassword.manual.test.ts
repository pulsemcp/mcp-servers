import { describe, it, expect, beforeAll } from 'vitest';
import { OnePasswordClient } from '../../shared/src/onepassword-client/onepassword-client.js';

/**
 * Manual tests that hit the real 1Password CLI.
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
  let client: OnePasswordClient;
  let serviceAccountToken: string | undefined;

  beforeAll(() => {
    // Check for required environment variables
    serviceAccountToken = process.env.OP_SERVICE_ACCOUNT_TOKEN;

    if (!serviceAccountToken) {
      console.warn('⚠️  OP_SERVICE_ACCOUNT_TOKEN not set in environment. Tests will be skipped.');
    } else {
      client = new OnePasswordClient(serviceAccountToken);
    }
  });

  describe('onepassword_list_vaults', () => {
    it('should list vaults with real CLI', async () => {
      const testName = 'list_vaults - real CLI call';

      if (!serviceAccountToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no service account token provided');
        return;
      }

      try {
        const vaults = await client.getVaults();

        expect(vaults).toBeInstanceOf(Array);
        expect(vaults.length).toBeGreaterThan(0);
        expect(vaults[0]).toHaveProperty('id');
        expect(vaults[0]).toHaveProperty('name');

        reportOutcome(testName, 'SUCCESS', `Found ${vaults.length} vault(s)`);
        console.log('Vaults:', vaults.map((v) => v.name).join(', '));
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

      if (!serviceAccountToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no service account token provided');
        return;
      }

      try {
        // First get vaults to find one to list items from
        const vaults = await client.getVaults();
        if (vaults.length === 0) {
          reportOutcome(testName, 'WARNING', 'No vaults available to test');
          return;
        }

        const items = await client.listItems(vaults[0].id);

        expect(items).toBeInstanceOf(Array);

        if (items.length > 0) {
          expect(items[0]).toHaveProperty('id');
          expect(items[0]).toHaveProperty('title');
          expect(items[0]).toHaveProperty('category');
        }

        reportOutcome(
          testName,
          'SUCCESS',
          `Found ${items.length} item(s) in vault "${vaults[0].name}"`
        );
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

      if (!serviceAccountToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no service account token provided');
        return;
      }

      try {
        // First get vaults and items to find one to get details for
        const vaults = await client.getVaults();
        if (vaults.length === 0) {
          reportOutcome(testName, 'WARNING', 'No vaults available to test');
          return;
        }

        const items = await client.listItems(vaults[0].id);
        if (items.length === 0) {
          reportOutcome(testName, 'WARNING', 'No items available in vault to test');
          return;
        }

        const item = await client.getItem(items[0].id, vaults[0].id);

        expect(item).toHaveProperty('id');
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

      if (!serviceAccountToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no service account token provided');
        return;
      }

      try {
        const vaults = await client.getVaults();
        if (vaults.length === 0) {
          reportOutcome(testName, 'WARNING', 'No vaults available to test');
          return;
        }

        const item = await client.createLogin(
          vaults[0].id,
          `Test Login ${Date.now()}`,
          'testuser',
          'testpass123',
          'https://example.com',
          ['test', 'manual']
        );

        expect(item).toHaveProperty('id');
        expect(item.category).toBe('LOGIN');

        reportOutcome(testName, 'SUCCESS', `Created login "${item.title}"`);
        console.log('Created item ID:', item.id);
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
