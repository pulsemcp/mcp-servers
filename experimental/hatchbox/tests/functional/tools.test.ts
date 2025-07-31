import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { getEnvVarsTool } from '../../shared/src/tools/get-env-vars.js';
import { getEnvVarTool } from '../../shared/src/tools/get-env-var.js';
import { setEnvVarTool } from '../../shared/src/tools/set-env-var.js';
import { deleteEnvVarsTool } from '../../shared/src/tools/delete-env-vars.js';
import { triggerDeployTool } from '../../shared/src/tools/trigger-deploy.js';
import { checkDeployTool } from '../../shared/src/tools/check-deploy.js';
import { createMockHatchboxClient } from '../mocks/hatchbox-client.functional-mock.js';

describe('Hatchbox Tools', () => {
  const mockServer = new Server({ name: 'test', version: '1.0' }, { capabilities: { tools: {} } });

  describe('getEnvVars', () => {
    it('should return an error indicating the operation is not supported', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain(
        'Retrieving environment variables is not supported by the Hatchbox API'
      );
      expect(response.content[0].text).toContain('The Hatchbox API only allows:');
      expect(response.content[0].text).toContain('Setting environment variables');
      expect(response.content[0].text).toContain('Deleting environment variables');
    });
  });

  describe('getEnvVar', () => {
    it('should return an error indicating the operation is not supported', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = getEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'RAILS_ENV' });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain(
        "Retrieving the value of 'RAILS_ENV' is not supported"
      );
      expect(response.content[0].text).toContain('The Hatchbox API only allows:');
      expect(response.content[0].text).toContain('Setting environment variables');
      expect(response.content[0].text).toContain('Deleting environment variables');
    });
  });

  describe('setEnvVar', () => {
    it('should set an environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = setEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'NEW_VAR', value: 'new_value' });

      expect(mockClient.setEnvVar).toHaveBeenCalledWith('NEW_VAR', 'new_value');
      expect(response.content[0].text).toBe(
        'Successfully set environment variable: NEW_VAR=new_value'
      );
    });

    it('should set another environment variable', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = setEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'RAILS_ENV', value: 'staging' });

      expect(mockClient.setEnvVar).toHaveBeenCalledWith('RAILS_ENV', 'staging');
      expect(response.content[0].text).toBe(
        'Successfully set environment variable: RAILS_ENV=staging'
      );
    });
  });

  describe('deleteEnvVars', () => {
    it('should delete environment variables', async () => {
      const mockClient = createMockHatchboxClient();
      const tool = deleteEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({ names: ['RAILS_ENV'] });

      expect(mockClient.deleteEnvVars).toHaveBeenCalledWith(['RAILS_ENV']);
      expect(response.content[0].text).toContain(
        'Successfully deleted environment variables: RAILS_ENV'
      );
      expect(response.content[0].text).toContain('1 environment variable remaining');
    });

    it('should delete multiple environment variables', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.deleteEnvVars.mockResolvedValue([]); // All vars deleted
      const tool = deleteEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({ names: ['RAILS_ENV', 'DATABASE_URL'] });

      expect(mockClient.deleteEnvVars).toHaveBeenCalledWith(['RAILS_ENV', 'DATABASE_URL']);
      expect(response.content[0].text).toContain(
        'Successfully deleted environment variables: RAILS_ENV, DATABASE_URL'
      );
      expect(response.content[0].text).toContain('0 environment variables remaining');
    });

    it('should handle deletion errors', async () => {
      const mockClient = createMockHatchboxClient();
      mockClient.deleteEnvVars.mockRejectedValue(new Error('Access denied'));
      const tool = deleteEnvVarsTool(mockServer, () => mockClient);

      const response = await tool.handler({ names: ['RAILS_ENV'] });

      expect(response.content[0].text).toContain(
        'Error deleting environment variables: Access denied'
      );
      expect(response.isError).toBe(true);
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
      mockClient.setEnvVar.mockRejectedValue(new Error('Invalid API key'));
      const tool = setEnvVarTool(mockServer, () => mockClient);

      const response = await tool.handler({ name: 'TEST', value: 'value' });

      expect(response.content[0].text).toContain(
        'Error setting environment variable: Invalid API key'
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
