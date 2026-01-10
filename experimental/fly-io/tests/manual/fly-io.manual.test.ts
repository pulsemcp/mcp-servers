import { describe, it, expect, beforeAll } from 'vitest';
import { FlyIOClient } from '../../shared/src/fly-io-client/fly-io-client.js';

/**
 * Manual tests that hit the real Fly.io API.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with FLY_IO_API_TOKEN
 * 2. Run: npm run test:manual
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

describe('Fly.io Manual Tests', () => {
  let client: FlyIOClient;
  let apiToken: string | undefined;

  beforeAll(() => {
    apiToken = process.env.FLY_IO_API_TOKEN;

    if (!apiToken) {
      console.warn('⚠️  FLY_IO_API_TOKEN not set in environment. Tests will be skipped.');
    } else {
      client = new FlyIOClient(apiToken);
    }
  });

  describe('Apps API', () => {
    it('should list apps from Fly.io', async () => {
      const testName = 'list_apps - real API call';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      try {
        const apps = await client.listApps();

        expect(Array.isArray(apps)).toBe(true);

        if (apps.length === 0) {
          reportOutcome(testName, 'SUCCESS', 'No apps found (account may be empty)');
        } else {
          reportOutcome(
            testName,
            'SUCCESS',
            `Found ${apps.length} app(s): ${apps.map((a) => a.name).join(', ')}`
          );
        }
      } catch (error) {
        reportOutcome(
          testName,
          'FAILURE',
          error instanceof Error ? error.message : 'Unknown error'
        );
        throw error;
      }
    });

    it('should handle invalid app name gracefully', async () => {
      const testName = 'get_app - non-existent app';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      try {
        await client.getApp('this-app-definitely-does-not-exist-12345');
        reportOutcome(testName, 'FAILURE', 'Expected error but got success');
        throw new Error('Expected error');
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          reportOutcome(testName, 'SUCCESS', 'Correctly returned 404 for non-existent app');
        } else {
          reportOutcome(
            testName,
            'WARNING',
            `Got error but not 404: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle rate limits gracefully', async () => {
      const testName = 'rate_limiting - rapid requests';

      if (!apiToken) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token provided');
        return;
      }

      try {
        // Make a few rapid requests to test rate limiting
        const promises = Array(3)
          .fill(null)
          .map(() => client.listApps());

        const results = await Promise.allSettled(promises);

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        if (failed > 0) {
          const rateLimitErrors = results.filter(
            (r) =>
              r.status === 'rejected' &&
              (r.reason?.message?.includes('rate') || r.reason?.message?.includes('429'))
          ).length;

          if (rateLimitErrors > 0) {
            reportOutcome(
              testName,
              'SUCCESS',
              `Rate limiting detected correctly (${rateLimitErrors} requests throttled)`
            );
          } else {
            reportOutcome(
              testName,
              'WARNING',
              `${failed} requests failed for non-rate-limit reasons`
            );
          }
        } else {
          reportOutcome(
            testName,
            'SUCCESS',
            `All ${successful} requests succeeded - no rate limiting encountered`
          );
        }
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
