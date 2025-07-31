import { describe, it, expect, beforeAll } from 'vitest';
import { HatchboxClient } from '../../shared/src/server.js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '../../.env') });

describe('Hatchbox Client Manual Tests', () => {
  const apiKey = process.env.HATCHBOX_API_KEY;
  const accountId = process.env.HATCHBOX_ACCOUNT_ID;
  const appId = process.env.HATCHBOX_APP_ID;
  const deployKey = process.env.HATCHBOX_DEPLOY_KEY;

  let client: HatchboxClient | null = null;

  const setupClient = () => {
    if (!apiKey || !accountId || !appId || !deployKey) {
      console.warn(
        '⚠️  Manual tests require HATCHBOX_API_KEY, HATCHBOX_ACCOUNT_ID, HATCHBOX_APP_ID, and HATCHBOX_DEPLOY_KEY'
      );
      console.warn('   Please create a .env file with your Hatchbox credentials');
      return null;
    }
    return new HatchboxClient(apiKey, accountId, appId, deployKey);
  };

  beforeAll(() => {
    client = setupClient();
    if (!client) {
      console.log('Skipping manual tests - no API credentials provided');
    }
  });

  describe('Environment Variables', () => {
    it.skip('should get all environment variables - not supported by API', async () => {
      // The Hatchbox API does not support retrieving environment variables
      // This test is skipped as the operation will always fail
      expect(true).toBe(true);
    });

    it('should set a test environment variable', async () => {
      if (!client) return;

      const testName = `TEST_VAR_${Date.now()}`;
      const testValue = 'test_value_from_manual_test';

      // The API returns an empty array on success
      const updatedVars = await client.setEnvVar(testName, testValue);
      console.log(`Set ${testName}=${testValue}`);

      // Since API returns empty response, we just check it doesn't throw
      expect(Array.isArray(updatedVars)).toBe(true);
    });

    it('should update an existing environment variable', async () => {
      if (!client) return;

      // Since we can't retrieve vars, we'll update a known test var
      const testName = 'TEST_UPDATE_VAR';
      const newValue = `updated_${Date.now()}`;

      // The API returns an empty array on success
      const updatedVars = await client.setEnvVar(testName, newValue);
      console.log(`Updated ${testName} to ${newValue}`);

      // Since API returns empty response, we just check it doesn't throw
      expect(Array.isArray(updatedVars)).toBe(true);
    });
  });

  describe('Deployments', () => {
    let deploymentId: string | null = null;

    it('should trigger a deployment with latest commit', async () => {
      if (!client) return;

      const deployment = await client.triggerDeploy();
      deploymentId = deployment.id;

      console.log(`Triggered deployment: ${deployment.id} (${deployment.status})`);

      expect(deployment).toHaveProperty('id');
      expect(deployment).toHaveProperty('status');
      expect(deployment.status).toBeTruthy();
    });

    it('should check deployment status', async () => {
      if (!client || !deploymentId) return;

      // Wait a moment for deployment to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const status = await client.checkDeploy(deploymentId);

      console.log(`Deployment ${status.id}: ${status.status}`);
      if (status.output) {
        console.log('Output preview:', status.output.substring(0, 200) + '...');
      }

      expect(status.id).toBe(deploymentId);
      expect(status.status).toBeTruthy();
    });

    it('should trigger deployment with specific SHA (if provided)', async () => {
      if (!client) return;

      // This test only runs if a SHA is provided in env
      const testSha = process.env.TEST_DEPLOY_SHA;
      if (!testSha) {
        console.log('Skipping SHA deployment test - no TEST_DEPLOY_SHA provided');
        return;
      }

      const deployment = await client.triggerDeploy(testSha);

      console.log(
        `Triggered deployment with SHA ${testSha}: ${deployment.id} (${deployment.status})`
      );

      expect(deployment).toHaveProperty('id');
      expect(deployment).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid credentials gracefully', async () => {
      if (!accountId || !appId || !deployKey) return;

      const badClient = new HatchboxClient('invalid_key', accountId, appId, deployKey);

      // Test with setEnvVar instead since getEnvVars is not supported
      await expect(badClient.setEnvVar('TEST', 'value')).rejects.toThrow('Invalid API key');
    });

    it('should handle invalid account/app IDs', async () => {
      if (!apiKey || !deployKey) return;

      const badClient = new HatchboxClient(apiKey, '99999', '99999', deployKey);

      // Test with setEnvVar instead since getEnvVars is not supported
      await expect(badClient.setEnvVar('TEST', 'value')).rejects.toThrow();
    });
  });
});
