import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit real Good Eggs API via Playwright browser automation.
 * These tests are NOT run in CI and require actual Good Eggs credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with credentials:
 *    GOOD_EGGS_USERNAME=your-email@example.com
 *    GOOD_EGGS_PASSWORD=your-password
 * 2. Run: npm run test:manual
 *
 * Test outcomes:
 * - SUCCESS: Test passed, Good Eggs responded as expected
 * - WARNING: Test passed but with unexpected behavior
 * - FAILURE: Test failed
 */

// Define test outcome types
type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

// Helper to report test outcomes
function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Good Eggs Manual Tests', () => {
  let client: TestMCPClient | null = null;
  let username: string | undefined;
  let password: string | undefined;

  beforeAll(async () => {
    // Check for required environment variables
    username = process.env.GOOD_EGGS_USERNAME;
    password = process.env.GOOD_EGGS_PASSWORD;

    if (!username || !password) {
      console.warn('⚠️  GOOD_EGGS_USERNAME and GOOD_EGGS_PASSWORD not set. Tests will be skipped.');
      return;
    }

    // Create test client with real credentials
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        GOOD_EGGS_USERNAME: username,
        GOOD_EGGS_PASSWORD: password,
        HEADLESS: 'true',
        TIMEOUT: '60000',
      },
      debug: false,
    });

    await client.connect();
  }, 120000); // 2 minute timeout for browser startup and login

  afterAll(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('search_for_grocery', () => {
    it('should search for groceries on real Good Eggs', async () => {
      const testName = 'search_for_grocery - real search';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('search_for_grocery', {
          query: 'organic apples',
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.includes('Found') && text.includes('groceries')) {
          reportOutcome(testName, 'SUCCESS', 'Search returned results');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else if (text.includes('No groceries found')) {
          reportOutcome(
            testName,
            'WARNING',
            'No results found - may be valid if no matching products'
          );
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('get_favorites', () => {
    it('should get user favorites from real Good Eggs', async () => {
      const testName = 'get_favorites - real favorites';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_favorites', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.includes('favorite items') || text.includes('No favorite')) {
          reportOutcome(testName, 'SUCCESS', 'Favorites retrieved successfully');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('search_for_freebie_groceries', () => {
    it('should search for deals on real Good Eggs', async () => {
      const testName = 'search_for_freebie_groceries - real deals';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('search_for_freebie_groceries', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.includes('deals/freebies') || text.includes('No free items')) {
          reportOutcome(testName, 'SUCCESS', 'Deals search completed');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });

  describe('get_list_of_past_order_dates', () => {
    it('should get past orders from real Good Eggs', async () => {
      const testName = 'get_list_of_past_order_dates - real orders';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_list_of_past_order_dates', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.includes('past orders') || text.includes('No past orders')) {
          reportOutcome(testName, 'SUCCESS', 'Past orders retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 60000);
  });
});
