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

    it('should filter deployments by state', async () => {
      const testName = 'list_deployments - filter by state';

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

        const result = await client.listDeployments({ limit: 5, state: 'READY' });

        expect(result).toHaveProperty('deployments');
        expect(Array.isArray(result.deployments)).toBe(true);
        // All returned deployments should be READY
        for (const deployment of result.deployments) {
          expect(deployment.state).toBe('READY');
        }

        reportOutcome(testName, 'SUCCESS', `Found ${result.deployments.length} READY deployments`);
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

  describe('get_deployment', () => {
    it('should get deployment details for a real deployment', async () => {
      const testName = 'get_deployment - real API';

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

        // First get a deployment to look up
        const deployments = await client.listDeployments({ limit: 1 });
        if (deployments.deployments.length === 0) {
          reportOutcome(testName, 'WARNING', 'No deployments found to test with');
          return;
        }

        const deploymentId = deployments.deployments[0].uid;
        const result = await client.getDeployment(deploymentId);

        expect(result).toHaveProperty('uid');
        expect(result).toHaveProperty('state');
        expect(result).toHaveProperty('readyState');
        expect(result.uid).toBe(deploymentId);

        reportOutcome(testName, 'SUCCESS', `Got deployment ${result.uid} (state: ${result.state})`);
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

  describe('get_deployment_events', () => {
    it('should get build logs for a real deployment', async () => {
      const testName = 'get_deployment_events - real API';

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

        const deployments = await client.listDeployments({ limit: 1 });
        if (deployments.deployments.length === 0) {
          reportOutcome(testName, 'WARNING', 'No deployments found to test with');
          return;
        }

        const deploymentId = deployments.deployments[0].uid;
        const result = await client.getDeploymentEvents(deploymentId, { limit: 10 });

        expect(Array.isArray(result)).toBe(true);

        reportOutcome(
          testName,
          'SUCCESS',
          `Got ${result.length} build log events for ${deploymentId}`
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

  describe('get_runtime_logs', () => {
    it('should get runtime logs for a real deployment', async () => {
      const testName = 'get_runtime_logs - real API';

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

        // Need a project + deployment
        const projects = await client.listProjects({ limit: 1 });
        if (projects.projects.length === 0) {
          reportOutcome(testName, 'WARNING', 'No projects found to test with');
          return;
        }

        const projectId = projects.projects[0].id;
        const deployments = await client.listDeployments({ projectId, limit: 1, state: 'READY' });
        if (deployments.deployments.length === 0) {
          reportOutcome(testName, 'WARNING', 'No READY deployments found to test with');
          return;
        }

        const deploymentId = deployments.deployments[0].uid;
        const result = await client.getRuntimeLogs(projectId, deploymentId);

        expect(Array.isArray(result)).toBe(true);

        reportOutcome(
          testName,
          'SUCCESS',
          `Got ${result.length} runtime log entries for ${deploymentId}`
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

    it('should get runtime logs with filtering parameters', async () => {
      const testName = 'get_runtime_logs - with filters';

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

        const projects = await client.listProjects({ limit: 1 });
        if (projects.projects.length === 0) {
          reportOutcome(testName, 'WARNING', 'No projects found to test with');
          return;
        }

        const projectId = projects.projects[0].id;
        const deployments = await client.listDeployments({ projectId, limit: 1, state: 'READY' });
        if (deployments.deployments.length === 0) {
          reportOutcome(testName, 'WARNING', 'No READY deployments found to test with');
          return;
        }

        const deploymentId = deployments.deployments[0].uid;
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        // Test with time range + level filter
        const result = await client.getRuntimeLogs(projectId, deploymentId, {
          since: oneHourAgo,
          until: now,
          level: 'error',
          limit: 10,
          direction: 'backward',
        });

        expect(Array.isArray(result)).toBe(true);

        reportOutcome(
          testName,
          'SUCCESS',
          `Got ${result.length} error log entries (last hour) for ${deploymentId}`
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

    it('should get runtime logs with search query', async () => {
      const testName = 'get_runtime_logs - with search';

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

        const projects = await client.listProjects({ limit: 1 });
        if (projects.projects.length === 0) {
          reportOutcome(testName, 'WARNING', 'No projects found to test with');
          return;
        }

        const projectId = projects.projects[0].id;
        const deployments = await client.listDeployments({ projectId, limit: 1, state: 'READY' });
        if (deployments.deployments.length === 0) {
          reportOutcome(testName, 'WARNING', 'No READY deployments found to test with');
          return;
        }

        const deploymentId = deployments.deployments[0].uid;

        // Test with search query
        const result = await client.getRuntimeLogs(projectId, deploymentId, {
          search: 'GET',
          source: 'serverless',
          limit: 5,
        });

        expect(Array.isArray(result)).toBe(true);

        reportOutcome(
          testName,
          'SUCCESS',
          `Got ${result.length} log entries matching "GET" from serverless source for ${deploymentId}`
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
});
