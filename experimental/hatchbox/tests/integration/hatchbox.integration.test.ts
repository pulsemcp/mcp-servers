import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const serverPath = join(__dirname, '../../local/build/index.integration-with-mock.js');

describe('Hatchbox MCP Server Integration', () => {
  const createMockedClient = async (mockData = {}) => {
    const client = new TestMCPClient({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        HATCHBOX_MOCK_DATA: JSON.stringify(mockData),
      },
    });

    await client.connect();
    return client;
  };

  describe('Environment Variables', () => {
    it('should list all available tools', async () => {
      const client = await createMockedClient();
      const tools = await client.listTools();

      expect(tools).toHaveLength(5);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('getEnvVars');
      expect(toolNames).toContain('getEnvVar');
      expect(toolNames).toContain('setEnvVar');
      expect(toolNames).toContain('triggerDeploy');
      expect(toolNames).toContain('checkDeploy');

      await client.close();
    });

    it('should retrieve all environment variables', async () => {
      const mockData = {
        envVars: [
          { name: 'NODE_ENV', value: 'production' },
          { name: 'API_KEY', value: 'secret123' },
        ],
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('getEnvVars', {});

      expect(result.content[0].text).toContain('NODE_ENV=production');
      expect(result.content[0].text).toContain('API_KEY=secret123');

      await client.close();
    });

    it('should get a specific environment variable', async () => {
      const mockData = {
        envVars: [
          { name: 'NODE_ENV', value: 'production' },
          { name: 'API_KEY', value: 'secret123' },
        ],
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('getEnvVar', { name: 'NODE_ENV' });

      expect(result.content[0].text).toBe('NODE_ENV=production');

      await client.close();
    });

    it('should set an environment variable', async () => {
      const client = await createMockedClient();

      const result = await client.callTool('setEnvVar', {
        name: 'NEW_VAR',
        value: 'new_value',
      });

      expect(result.content[0].text).toContain('Successfully');
      expect(result.content[0].text).toContain('NEW_VAR=new_value');

      await client.close();
    });
  });

  describe('Deployments', () => {
    it('should trigger a deployment', async () => {
      const mockData = {
        deploymentId: 'deploy-123',
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('triggerDeploy', {});

      expect(result.content[0].text).toContain('Deployment triggered successfully!');
      expect(result.content[0].text).toContain('Activity ID: deploy-123');
      expect(result.content[0].text).toContain('Status: pending');

      await client.close();
    });

    it('should trigger deployment with specific SHA', async () => {
      const mockData = {
        deploymentId: 'deploy-456',
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('triggerDeploy', { sha: 'abc123' });

      expect(result.content[0].text).toContain('Deployment triggered successfully!');
      expect(result.content[0].text).toContain('Activity ID: deploy-456');

      await client.close();
    });

    it('should check deployment status', async () => {
      const mockData = {
        deploymentStatus: 'running',
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('checkDeploy', { activityId: 'deploy-123' });

      expect(result.content[0].text).toContain('⏳ Deployment Status: running');
      expect(result.content[0].text).toContain('Activity ID: deploy-123');

      await client.close();
    });

    it('should show completed deployment', async () => {
      const mockData = {
        deploymentStatus: 'completed',
      };
      const client = await createMockedClient(mockData);

      const result = await client.callTool('checkDeploy', { activityId: 'deploy-789' });

      expect(result.content[0].text).toContain('✅ Deployment Status: completed');
      expect(result.content[0].text).toContain('Deployment completed successfully');

      await client.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      const client = await createMockedClient();

      await expect(client.callTool('getEnvVar', {})).rejects.toThrow();
      await expect(client.callTool('setEnvVar', { name: 'TEST' })).rejects.toThrow();
      await expect(client.callTool('checkDeploy', {})).rejects.toThrow();

      await client.close();
    });

    it('should handle unknown tool gracefully', async () => {
      const client = await createMockedClient();

      await expect(client.callTool('unknownTool', {})).rejects.toThrow('Unknown tool');

      await client.close();
    });
  });
});
