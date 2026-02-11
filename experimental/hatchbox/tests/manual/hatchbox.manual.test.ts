import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Hatchbox MCP Server Manual Tests', () => {
  let client: TestMCPClient;

  const apiKey = process.env.HATCHBOX_API_KEY;
  const accountId = process.env.HATCHBOX_ACCOUNT_ID;
  const appId = process.env.HATCHBOX_APP_ID;
  const deployKey = process.env.HATCHBOX_DEPLOY_KEY;
  const serverIP = process.env.WEB_SERVER_IP_ADDRESS;
  const sshKeyPath = process.env.SSH_KEY_PATH;
  const appName = process.env.HATCHBOX_APP_NAME;

  beforeAll(async () => {
    if (!apiKey || !accountId || !appId || !deployKey) {
      throw new Error(
        'Manual tests require HATCHBOX_API_KEY, HATCHBOX_ACCOUNT_ID, HATCHBOX_APP_ID, and HATCHBOX_DEPLOY_KEY environment variables'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    const env: Record<string, string> = {
      HATCHBOX_API_KEY: apiKey,
      HATCHBOX_ACCOUNT_ID: accountId,
      HATCHBOX_APP_ID: appId,
      HATCHBOX_DEPLOY_KEY: deployKey,
    };

    if (serverIP) {
      env.WEB_SERVER_IP_ADDRESS = serverIP;
    }
    if (sshKeyPath) {
      env.SSH_KEY_PATH = sshKeyPath;
    }
    if (appName) {
      env.HATCHBOX_APP_NAME = appName;
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

  describe('Environment Variables', () => {
    it('should get all environment variables via SSH', async () => {
      if (!serverIP) {
        console.log('Skipping SSH test - no WEB_SERVER_IP_ADDRESS configured');
        return;
      }

      const result = await client.callTool<{ type: string; text: string }>('getEnvVars', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Environment variables');
      console.log(`Retrieved environment variables via SSH`);
    });

    it('should get a specific environment variable via SSH', async () => {
      if (!serverIP) {
        console.log('Skipping SSH test - no WEB_SERVER_IP_ADDRESS configured');
        return;
      }

      const result = await client.callTool<{ type: string; text: string }>('getEnvVar', {
        name: 'RAILS_ENV',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('RAILS_ENV');
      console.log(`Result: ${result.content[0].text}`);
    });

    it('should return not found for non-existent environment variable', async () => {
      if (!serverIP) {
        console.log('Skipping SSH test - no WEB_SERVER_IP_ADDRESS configured');
        return;
      }

      const result = await client.callTool<{ type: string; text: string }>('getEnvVar', {
        name: 'NONEXISTENT_VAR_12345',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('not found');
    });

    it('should set a test environment variable', async () => {
      const testName = `TEST_VAR_${Date.now()}`;
      const testValue = 'test_value_from_manual_test';

      const result = await client.callTool<{ type: string; text: string }>('setEnvVar', {
        name: testName,
        value: testValue,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Successfully set environment variable');
      console.log(`Set ${testName}=${testValue}`);
    });

    it('should update an existing environment variable', async () => {
      const testName = 'TEST_UPDATE_VAR';
      const newValue = `updated_${Date.now()}`;

      const result = await client.callTool<{ type: string; text: string }>('setEnvVar', {
        name: testName,
        value: newValue,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Successfully set environment variable');
      console.log(`Updated ${testName} to ${newValue}`);
    });
  });

  describe('Deployments', () => {
    let deploymentId: string | null = null;

    it('should trigger a deployment with latest commit', async () => {
      const result = await client.callTool<{ type: string; text: string }>('triggerDeploy', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Deployment triggered successfully');

      // Extract activity ID from response
      const match = result.content[0].text.match(/Activity ID: (.+)/);
      if (match) {
        deploymentId = match[1].trim();
      }

      console.log(`Triggered deployment: ${result.content[0].text}`);
    });

    it('should check deployment status', async () => {
      if (!deploymentId) return;

      // Wait a moment for deployment to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await client.callTool<{ type: string; text: string }>('checkDeploy', {
        activityId: deploymentId,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Deployment Status');
      console.log(`Deployment status: ${result.content[0].text}`);
    });

    it('should trigger deployment with specific SHA (if provided)', async () => {
      const testSha = process.env.TEST_DEPLOY_SHA;
      if (!testSha) {
        console.log('Skipping SHA deployment test - no TEST_DEPLOY_SHA provided');
        return;
      }

      const result = await client.callTool<{ type: string; text: string }>('triggerDeploy', {
        sha: testSha,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Deployment triggered successfully');
      console.log(`Triggered deployment with SHA ${testSha}: ${result.content[0].text}`);
    });
  });
});
