import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Manual tests that hit the real Vercel API.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with VERCEL_TOKEN
 * 2. Run: npm run test:manual
 */

type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Vercel Manual Tests', () => {
  let token: string | undefined;

  beforeAll(() => {
    token = process.env.VERCEL_TOKEN;
    if (!token) {
      console.warn('⚠️  VERCEL_TOKEN not set in environment. Tests will be skipped.');
    }
  });

  describe('list_deployments', () => {
    it('should list deployments from real API', async () => {
      const testName = 'list_deployments - real API';

      if (!token) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token');
        return;
      }

      try {
        const { VercelClient } = await import('../../shared/src/server.js');
        const client = new VercelClient(
          token,
          process.env.VERCEL_TEAM_ID,
          process.env.VERCEL_TEAM_SLUG
        );

        const result = await client.listDeployments({ limit: 5 });

        expect(result).toHaveProperty('deployments');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.deployments)).toBe(true);

        reportOutcome(testName, 'SUCCESS', `Found ${result.deployments.length} deployments`);
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

  describe('list_projects', () => {
    it('should list projects from real API', async () => {
      const testName = 'list_projects - real API';

      if (!token) {
        reportOutcome(testName, 'WARNING', 'Skipped - no API token');
        return;
      }

      try {
        const { VercelClient } = await import('../../shared/src/server.js');
        const client = new VercelClient(
          token,
          process.env.VERCEL_TEAM_ID,
          process.env.VERCEL_TEAM_SLUG
        );

        const result = await client.listProjects({ limit: 5 });

        expect(result).toHaveProperty('projects');
        expect(Array.isArray(result.projects)).toBe(true);

        reportOutcome(testName, 'SUCCESS', `Found ${result.projects.length} projects`);
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
