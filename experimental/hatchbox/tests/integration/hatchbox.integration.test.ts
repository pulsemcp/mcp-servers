import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const serverPath = join(__dirname, '../../local/build/index.integration-with-mock.js');

describe('Hatchbox MCP Server Integration', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });
  const createMockedClient = async (mockData = {}) => {
    const client = new TestMCPClient({
      serverPath,
      env: {
        HATCHBOX_API_KEY: 'test-api-key',
        HATCHBOX_ACCOUNT_ID: 'test-account',
        HATCHBOX_APP_ID: 'test-app',
        HATCHBOX_DEPLOY_KEY: 'test-deploy-key',
        HATCHBOX_MOCK_DATA: JSON.stringify(mockData),
      },
      debug: false,
    });

    await client.connect();
    return client;
  };

  describe('Environment Variables', () => {
    it('should list all available tools', async () => {
      client = await createMockedClient();
      const result = await client.listTools();

      expect(result.tools).toHaveLength(6);
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('getEnvVars');
      expect(toolNames).toContain('getEnvVar');
      expect(toolNames).toContain('setEnvVar');
      expect(toolNames).toContain('deleteEnvVars');
      expect(toolNames).toContain('triggerDeploy');
      expect(toolNames).toContain('checkDeploy');
    });

    it('should return error for getEnvVars as it is not supported', async () => {
      client = await createMockedClient();

      const result = await client.callTool('getEnvVars', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Retrieving environment variables is not supported by the Hatchbox API'
      );
    });

    it('should return error for getEnvVar as it is not supported', async () => {
      client = await createMockedClient();

      const result = await client.callTool('getEnvVar', { name: 'NODE_ENV' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Retrieving the value of 'NODE_ENV' is not supported"
      );
    });

    it('should set an environment variable', async () => {
      client = await createMockedClient();

      const result = await client.callTool('setEnvVar', {
        name: 'NEW_VAR',
        value: 'new_value',
      });

      expect(result.content[0].text).toBe(
        'Successfully set environment variable: NEW_VAR=new_value'
      );
    });
  });

  describe('Deployments', () => {
    it('should trigger a deployment', async () => {
      const mockData = {
        deploymentId: 'deploy-123',
      };
      client = await createMockedClient(mockData);

      const result = await client.callTool('triggerDeploy', {});

      expect(result.content[0].text).toContain('Deployment triggered successfully!');
      expect(result.content[0].text).toContain('Activity ID: deploy-123');
      expect(result.content[0].text).toContain('Status: pending');
    });

    it('should trigger deployment with specific SHA', async () => {
      const mockData = {
        deploymentId: 'deploy-456',
      };
      client = await createMockedClient(mockData);

      const result = await client.callTool('triggerDeploy', { sha: 'abc123' });

      expect(result.content[0].text).toContain('Deployment triggered successfully!');
      expect(result.content[0].text).toContain('Activity ID: deploy-456');
    });

    it('should check deployment status', async () => {
      const mockData = {
        deploymentStatus: 'running',
      };
      client = await createMockedClient(mockData);

      const result = await client.callTool('checkDeploy', { activityId: 'deploy-123' });

      expect(result.content[0].text).toContain('⏳ Deployment Status: running');
      expect(result.content[0].text).toContain('Activity ID: deploy-123');
    });

    it('should show completed deployment', async () => {
      const mockData = {
        deploymentStatus: 'completed',
      };
      client = await createMockedClient(mockData);

      const result = await client.callTool('checkDeploy', { activityId: 'deploy-789' });

      expect(result.content[0].text).toContain('✅ Deployment Status: completed');
      expect(result.content[0].text).toContain('Deployment completed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      client = await createMockedClient();

      await expect(client.callTool('getEnvVar', {})).rejects.toThrow();
      await expect(client.callTool('setEnvVar', { name: 'TEST' })).rejects.toThrow();
      await expect(client.callTool('checkDeploy', {})).rejects.toThrow();
    });

    it('should handle unknown tool gracefully', async () => {
      client = await createMockedClient();

      await expect(client.callTool('unknownTool', {})).rejects.toThrow('Unknown tool');
    });
  });
});
