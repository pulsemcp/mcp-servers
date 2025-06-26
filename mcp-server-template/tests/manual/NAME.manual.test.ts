import { describe, it, expect, beforeAll } from 'vitest';
import { TestMCPClient } from '@/test-mcp-client.js';
import { IExampleClient } from '@/server.js';

/**
 * Manual tests that hit real external APIs.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with required credentials (e.g., YOUR_API_KEY)
 * 2. Run: npm run test:manual
 *
 * Test outcomes:
 * - SUCCESS: Test passed, API responded as expected
 * - WARNING: Test passed but with unexpected behavior worth investigating
 * - FAILURE: Test failed, API error or unexpected response
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

describe('NAME Manual Tests', () => {
  let client: TestMCPClient<{ client: IExampleClient }>;
  let apiKey: string | undefined;

  beforeAll(() => {
    // Check for required environment variables
    apiKey = process.env.YOUR_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  YOUR_API_KEY not set in environment. Some tests will be skipped.');
    }

    // Create test client - in real implementation, you'd pass the actual client
    client = new TestMCPClient({
      client: {} as IExampleClient, // Replace with real client in actual implementation
    });
  });

  describe('example_tool', () => {
    it('should process message with real API', async () => {
      const testName = 'example_tool - real API call';

      if (!apiKey) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API key provided');
        return;
      }

      try {
        const result = await client.request({
          method: 'tools/call',
          params: {
            name: 'example_tool',
            arguments: {
              message: 'Test message for manual testing',
            },
          },
        });

        // Verify the response structure
        expect(result).toHaveProperty('content');
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content[0]).toHaveProperty('type', 'text');

        const responseText = result.content[0].text;
        console.log('Response:', responseText);

        // Check for specific patterns in the response
        if (responseText.includes('error')) {
          reportOutcome(testName, 'WARNING', 'Response contains error keyword');
        } else if (responseText.includes('Processed message')) {
          reportOutcome(testName, 'SUCCESS', 'Message processed successfully');
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
    });

    it('should handle API rate limits gracefully', async () => {
      const testName = 'example_tool - rate limit handling';

      if (!apiKey) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API key provided');
        return;
      }

      try {
        // Make multiple rapid requests to test rate limiting
        const promises = Array(5)
          .fill(null)
          .map((_, i) =>
            client.request({
              method: 'tools/call',
              params: {
                name: 'example_tool',
                arguments: {
                  message: `Rapid request ${i + 1}`,
                },
              },
            })
          );

        const results = await Promise.allSettled(promises);

        const successful = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        console.log(`Successful: ${successful}, Failed: ${failed}`);

        if (failed > 0) {
          // Check if failures are due to rate limiting
          const rateLimitErrors = results.filter(
            (r) => r.status === 'rejected' && r.reason?.message?.includes('rate')
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
            'All requests succeeded - no rate limiting encountered'
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

  // Add more manual tests here for other tools and edge cases
});
