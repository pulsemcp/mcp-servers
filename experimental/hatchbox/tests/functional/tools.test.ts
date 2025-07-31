import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getEnvVarsTool } from '../../shared/src/tools/get-env-vars.js';
import { getEnvVarTool } from '../../shared/src/tools/get-env-var.js';
import { setEnvVarTool } from '../../shared/src/tools/set-env-var.js';
import { triggerDeployTool } from '../../shared/src/tools/trigger-deploy.js';
import { checkDeployTool } from '../../shared/src/tools/check-deploy.js';
import { createMockHatchboxClient } from '../mocks/hatchbox-client.functional-mock.js';

describe('Hatchbox Tools', () => {
  const mockServer = new Server({ name: 'test', version: '1.0' }, { capabilities: { tools: {} } });

  describe('getEnvVars', () => {
    it('should retrieve all environment variables', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(mockClient.getEnvVars).toHaveBeenCalled();
      expect(response.content[0].text).toContain('RAILS_ENV=production');
      expect(response.content[0].text).toContain('DATABASE_URL=postgres://localhost/myapp');
    });

    it('should handle empty environment variables', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.getEnvVars.mockResolvedValue([]);
      const tool = getEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.content[0].text).toBe('No environment variables found');
    });
  });

  describe('getEnvVar', () => {
    it('should retrieve a specific environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'RAILS_ENV' });

      expect(mockClient.getEnvVars).toHaveBeenCalled();
      expect(response.content[0].text).toBe('RAILS_ENV=production');
    });

    it('should handle non-existent environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'NON_EXISTENT' });

      expect(response.content[0].text).toBe("Environment variable 'NON_EXISTENT' not found");
    });
  });

  describe('setEnvVar', () => {
    it('should set a new environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.getEnvVars.mockResolvedValue([]); // No existing vars
      const tool = setEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'NEW_VAR', value: 'new_value' });

      expect(mockClient.setEnvVar).toHaveBeenCalledWith('NEW_VAR', 'new_value');
      expect(response.content[0].text).toContain(
        'Successfully created environment variable: NEW_VAR=new_value'
      );
    });

    it('should update an existing environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = setEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'RAILS_ENV', value: 'staging' });

      expect(mockClient.setEnvVar).toHaveBeenCalledWith('RAILS_ENV', 'staging');
      expect(response.content[0].text).toContain(
        'Successfully updated environment variable: RAILS_ENV=staging'
      );
    });
  });

  describe('triggerDeploy', () => {
    it('should trigger deployment with latest commit', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = triggerDeployTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(mockClient.triggerDeploy).toHaveBeenCalledWith(undefined);
      expect(response.content[0].text).toContain('Deployment triggered successfully!');
      expect(response.content[0].text).toContain('Activity ID: 12345');
      expect(response.content[0].text).toContain('Status: pending');
    });

    it('should trigger deployment with specific SHA', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = triggerDeployTool(mockServer, () => mockClient);

      const response = await tool.handler({ sha: 'abc123' });

      expect(mockClient.triggerDeploy).toHaveBeenCalledWith('abc123');
      expect(response.content[0].text).toContain('Deployment triggered successfully!');
    });
  });

  describe('checkDeploy', () => {
    it('should check deployment status', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = checkDeployTool(mockServer, () => mockClient);

      const response = await tool.handler({ activityId: '12345' });

      expect(mockClient.checkDeploy).toHaveBeenCalledWith('12345');
      expect(response.content[0].text).toContain('✅ Deployment Status: completed');
      expect(response.content[0].text).toContain('Activity ID: 12345');
      expect(response.content[0].text).toContain('Deployment completed successfully');
    });

    it('should show appropriate emoji for different statuses', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.checkDeploy.mockResolvedValue({
        id: '12345',
        status: 'failed',
        output: 'Deployment failed',
      });
      const tool = checkDeployTool(mockServer, () => mockClient);

      const response = await tool.handler({ activityId: '12345' });

      expect(response.content[0].text).toContain('❌ Deployment Status: failed');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.getEnvVars.mockRejectedValue(new Error('Invalid API key'));
      const tool = getEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.content[0].text).toContain(
        'Error retrieving environment variables: Invalid API key'
      );
      expect(response.isError).toBe(true);
    });

    it('should validate input parameters', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarTool(mockServer, () => mockClient);

      // Missing required 'name' parameter
      await expect(tool.handler({})).rejects.toThrow();
    });
  });
});
