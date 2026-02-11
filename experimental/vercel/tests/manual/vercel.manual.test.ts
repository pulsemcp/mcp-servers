import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit the real Vercel API via the MCP server.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with VERCEL_TOKEN
 * 2. Run: npm run test:manual
 */
describe('Vercel MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error('VERCEL_TOKEN environment variable is required');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      VERCEL_TOKEN: token,
    };

    if (process.env.VERCEL_TEAM_ID) {
      env.VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
    }
    if (process.env.VERCEL_TEAM_SLUG) {
      env.VERCEL_TEAM_SLUG = process.env.VERCEL_TEAM_SLUG;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('list_deployments', () => {
    it('should list deployments from real API', async () => {
      const result = await client.callTool('list_deployments', { limit: 5 });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('deployments');
      expect(parsed).toHaveProperty('pagination');
      expect(Array.isArray(parsed.deployments)).toBe(true);

      console.log(`Found ${parsed.deployments.length} deployments`);
    });

    it('should filter deployments by state', async () => {
      const result = await client.callTool('list_deployments', {
        limit: 5,
        state: 'READY',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('deployments');
      expect(Array.isArray(parsed.deployments)).toBe(true);

      // All returned deployments should be READY
      for (const deployment of parsed.deployments) {
        expect(deployment.state).toBe('READY');
      }

      console.log(`Found ${parsed.deployments.length} READY deployments`);
    });
  });

  describe('list_projects', () => {
    it('should list projects from real API', async () => {
      const result = await client.callTool('list_projects', { limit: 5 });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('projects');
      expect(Array.isArray(parsed.projects)).toBe(true);

      console.log(`Found ${parsed.projects.length} projects`);
    });
  });

  describe('get_deployment', () => {
    it('should get deployment details for a real deployment', async () => {
      // First get a deployment to look up
      const listResult = await client.callTool('list_deployments', { limit: 1 });
      expect(listResult.isError).toBeFalsy();

      const listParsed = JSON.parse(listResult.content[0].text);
      if (listParsed.deployments.length === 0) {
        console.log('No deployments found to test with');
        return;
      }

      const deploymentId = listParsed.deployments[0].uid;
      const result = await client.callTool('get_deployment', {
        idOrUrl: deploymentId,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('uid');
      expect(parsed).toHaveProperty('state');
      expect(parsed).toHaveProperty('readyState');
      expect(parsed.uid).toBe(deploymentId);

      console.log(`Got deployment ${parsed.uid} (state: ${parsed.state})`);
    });
  });

  describe('get_deployment_events', () => {
    it('should get build logs for a real deployment', async () => {
      const listResult = await client.callTool('list_deployments', { limit: 1 });
      expect(listResult.isError).toBeFalsy();

      const listParsed = JSON.parse(listResult.content[0].text);
      if (listParsed.deployments.length === 0) {
        console.log('No deployments found to test with');
        return;
      }

      const deploymentId = listParsed.deployments[0].uid;
      const result = await client.callTool('get_deployment_events', {
        idOrUrl: deploymentId,
        limit: 10,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);

      console.log(`Got ${parsed.length} build log events for ${deploymentId}`);
    });
  });

  describe('get_runtime_logs', () => {
    it('should get runtime logs for a real deployment', async () => {
      // Need a project + deployment
      const projectsResult = await client.callTool('list_projects', { limit: 1 });
      expect(projectsResult.isError).toBeFalsy();

      const projectsParsed = JSON.parse(projectsResult.content[0].text);
      if (projectsParsed.projects.length === 0) {
        console.log('No projects found to test with');
        return;
      }

      const projectId = projectsParsed.projects[0].id;
      const deploymentsResult = await client.callTool('list_deployments', {
        projectId,
        limit: 1,
        state: 'READY',
      });
      expect(deploymentsResult.isError).toBeFalsy();

      const deploymentsParsed = JSON.parse(deploymentsResult.content[0].text);
      if (deploymentsParsed.deployments.length === 0) {
        console.log('No READY deployments found to test with');
        return;
      }

      const deploymentId = deploymentsParsed.deployments[0].uid;
      const result = await client.callTool('get_runtime_logs', {
        projectId,
        deploymentId,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);

      console.log(`Got ${parsed.length} runtime log entries for ${deploymentId}`);
    });

    it('should get runtime logs with filtering parameters', async () => {
      const projectsResult = await client.callTool('list_projects', { limit: 1 });
      expect(projectsResult.isError).toBeFalsy();

      const projectsParsed = JSON.parse(projectsResult.content[0].text);
      if (projectsParsed.projects.length === 0) {
        console.log('No projects found to test with');
        return;
      }

      const projectId = projectsParsed.projects[0].id;
      const deploymentsResult = await client.callTool('list_deployments', {
        projectId,
        limit: 1,
        state: 'READY',
      });
      expect(deploymentsResult.isError).toBeFalsy();

      const deploymentsParsed = JSON.parse(deploymentsResult.content[0].text);
      if (deploymentsParsed.deployments.length === 0) {
        console.log('No READY deployments found to test with');
        return;
      }

      const deploymentId = deploymentsParsed.deployments[0].uid;
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Test with time range + level filter
      const result = await client.callTool('get_runtime_logs', {
        projectId,
        deploymentId,
        since: oneHourAgo,
        until: now,
        level: 'error',
        limit: 10,
        direction: 'backward',
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);

      console.log(`Got ${parsed.length} error log entries (last hour) for ${deploymentId}`);
    });

    it('should get runtime logs with search query', async () => {
      const projectsResult = await client.callTool('list_projects', { limit: 1 });
      expect(projectsResult.isError).toBeFalsy();

      const projectsParsed = JSON.parse(projectsResult.content[0].text);
      if (projectsParsed.projects.length === 0) {
        console.log('No projects found to test with');
        return;
      }

      const projectId = projectsParsed.projects[0].id;
      const deploymentsResult = await client.callTool('list_deployments', {
        projectId,
        limit: 1,
        state: 'READY',
      });
      expect(deploymentsResult.isError).toBeFalsy();

      const deploymentsParsed = JSON.parse(deploymentsResult.content[0].text);
      if (deploymentsParsed.deployments.length === 0) {
        console.log('No READY deployments found to test with');
        return;
      }

      const deploymentId = deploymentsParsed.deployments[0].uid;

      // Test with search query
      const result = await client.callTool('get_runtime_logs', {
        projectId,
        deploymentId,
        search: 'GET',
        source: 'serverless',
        limit: 5,
      });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed)).toBe(true);

      console.log(
        `Got ${parsed.length} log entries matching "GET" from serverless source for ${deploymentId}`
      );
    });
  });
});
