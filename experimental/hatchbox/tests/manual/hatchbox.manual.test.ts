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
    it('should get all environment variables', async () => {
      if (!client) return;

      const envVars = await client.getEnvVars();
      console.log(`Found ${envVars.length} environment variables`);

      expect(Array.isArray(envVars)).toBe(true);
      envVars.forEach((env) => {
        expect(env).toHaveProperty('name');
        expect(env).toHaveProperty('value');
        console.log(`  ${env.name}=${env.value.substring(0, 20)}...`);
      });
    });

    it('should set a test environment variable', async () => {
      if (!client) return;

      const testName = `TEST_VAR_${Date.now()}`;
      const testValue = 'test_value_from_manual_test';

      const updatedVars = await client.setEnvVar(testName, testValue);
      console.log(`Set ${testName}=${testValue}`);

      expect(Array.isArray(updatedVars)).toBe(true);
      const foundVar = updatedVars.find((env) => env.name === testName);
      expect(foundVar).toBeDefined();
      expect(foundVar?.value).toBe(testValue);
    });

    it('should update an existing environment variable', async () => {
      if (!client) return;

      // First get current vars to find one to update
      const currentVars = await client.getEnvVars();
      if (currentVars.length === 0) {
        console.log('No existing variables to update');
        return;
      }

      // Find a test variable or use the first one
      const testVar = currentVars.find((v) => v.name.startsWith('TEST_')) || currentVars[0];
      const newValue = `updated_${Date.now()}`;

      const updatedVars = await client.setEnvVar(testVar.name, newValue);
      console.log(`Updated ${testVar.name} to ${newValue}`);

      const foundVar = updatedVars.find((env) => env.name === testVar.name);
      expect(foundVar?.value).toBe(newValue);
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
      const badClient = new HatchboxClient('invalid_key', accountId!, appId!, deployKey!);

      await expect(badClient.getEnvVars()).rejects.toThrow('Invalid API key');
    });

    it('should handle invalid account/app IDs', async () => {
      if (!apiKey || !deployKey) return;

      const badClient = new HatchboxClient(apiKey, '99999', '99999', deployKey);

      await expect(badClient.getEnvVars()).rejects.toThrow();
    });
  });
});
