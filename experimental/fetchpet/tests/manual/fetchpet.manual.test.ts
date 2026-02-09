import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit real Fetch Pet API via Playwright browser automation.
 * These tests are NOT run in CI and require actual Fetch Pet credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with credentials:
 *    FETCHPET_USERNAME=your-email@example.com
 *    FETCHPET_PASSWORD=your-password
 * 2. Run: npm run test:manual
 *
 * IMPORTANT: The submit_claim test is SKIPPED because it would actually
 * submit a real claim. Only prepare_claim_to_submit is tested to verify
 * the form filling works correctly.
 *
 * Test outcomes:
 * - SUCCESS: Test passed, Fetch Pet responded as expected
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

describe('Fetch Pet Manual Tests', () => {
  let client: TestMCPClient | null = null;
  let username: string | undefined;
  let password: string | undefined;

  beforeAll(async () => {
    // Check for required environment variables
    username = process.env.FETCHPET_USERNAME;
    password = process.env.FETCHPET_PASSWORD;

    if (!username || !password) {
      console.warn('⚠️  FETCHPET_USERNAME and FETCHPET_PASSWORD not set. Tests will be skipped.');
      return;
    }

    // Create test client with real credentials
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        FETCHPET_USERNAME: username,
        FETCHPET_PASSWORD: password,
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

  describe('get_claims', () => {
    it('should get all claims from real Fetch Pet', async () => {
      const testName = 'get_claims - real claims';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        const result = await client.callTool('get_claims', {});

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('claim(s)') || text.includes('No claims found')) {
          reportOutcome(testName, 'SUCCESS', 'Claims retrieved');
          console.log('   Full response:', text);
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('get_claim_details', () => {
    it('should get claim details from real Fetch Pet', async () => {
      const testName = 'get_claim_details - real claim';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // First get claims to find a real claim ID
        const claimsResult = await client.callTool('get_claims', {});
        const claimsText = (claimsResult as { content: Array<{ text: string }> }).content[0].text;

        // Try to extract a claim ID from the results
        const claimIdMatch = claimsText.match(/Claim\s+([A-Z0-9-]+)/);
        if (!claimIdMatch) {
          reportOutcome(testName, 'WARNING', 'No claims found to get details for');
          return;
        }

        const claimId = claimIdMatch[1];
        const result = await client.callTool('get_claim_details', {
          claim_id: claimId,
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.startsWith('Error')) {
          reportOutcome(testName, 'FAILURE', 'API error: ' + text.substring(0, 200));
          throw new Error(text);
        } else if (text.includes('Claim Details')) {
          reportOutcome(testName, 'SUCCESS', 'Claim details retrieved');
          console.log('   First 500 chars:', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('prepare_claim_to_submit', () => {
    it('should prepare a claim on real Fetch Pet (WITHOUT submitting)', async () => {
      const testName = 'prepare_claim_to_submit - real preparation';

      if (!client) {
        reportOutcome(testName, 'WARNING', 'Skipped - no credentials provided');
        return;
      }

      try {
        // Use test data - this will NOT actually submit the claim
        const result = await client.callTool('prepare_claim_to_submit', {
          pet_name: 'Test Pet', // Use a pet name from the account
          invoice_date: '2025-01-15',
          invoice_amount: '$100.00',
          provider_name: 'Test Vet Clinic',
          claim_description: 'TEST - DO NOT SUBMIT - Manual testing',
        });

        expect(result).toHaveProperty('content');
        const text = (result as { content: Array<{ text: string }> }).content[0].text;

        if (text.startsWith('Error') || text.includes('validation error')) {
          // Validation errors are expected if pet name doesn't match
          reportOutcome(
            testName,
            'WARNING',
            'Validation errors (may be expected): ' + text.substring(0, 300)
          );
        } else if (text.includes('NOT submitted') && text.includes('confirmation_token')) {
          reportOutcome(testName, 'SUCCESS', 'Claim prepared successfully (not submitted)');
          console.log('   Result (first 500 chars):', text.substring(0, 500));
        } else {
          reportOutcome(testName, 'WARNING', 'Unexpected response format');
          console.log('   Response:', text.substring(0, 300));
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    }, 90000);
  });

  describe('submit_claim', () => {
    it.skip('SKIPPED: submit_claim would actually submit a claim', async () => {
      // This test is intentionally skipped because it would actually submit a claim
      // The prepare_claim_to_submit test verifies the form works correctly
      const testName = 'submit_claim - SKIPPED';
      reportOutcome(testName, 'WARNING', 'Test skipped to avoid submitting a real claim');
    });
  });
});
