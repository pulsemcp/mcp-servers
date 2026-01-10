import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listAppsTool } from '../../shared/src/tools/list-apps.js';
import { getAppTool } from '../../shared/src/tools/get-app.js';
import { createAppTool } from '../../shared/src/tools/create-app.js';
import { deleteAppTool } from '../../shared/src/tools/delete-app.js';
import { listMachinesTool } from '../../shared/src/tools/list-machines.js';
import { getMachineTool } from '../../shared/src/tools/get-machine.js';
import { createMachineTool } from '../../shared/src/tools/create-machine.js';
import { updateMachineTool } from '../../shared/src/tools/update-machine.js';
import { deleteMachineTool } from '../../shared/src/tools/delete-machine.js';
import { startMachineTool } from '../../shared/src/tools/start-machine.js';
import { stopMachineTool } from '../../shared/src/tools/stop-machine.js';
import { createMockFlyIOClient } from '../mocks/fly-io-client.functional-mock.js';

describe('Tools', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockFlyIOClient>;

  beforeEach(() => {
    // Minimal mock server for testing - we call tool handlers directly
    mockServer = {} as Server;
    mockClient = createMockFlyIOClient();
  });

  describe('list_apps', () => {
    it('should list apps successfully', async () => {
      const tool = listAppsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('test-app');
      expect(mockClient.listApps).toHaveBeenCalled();
    });
  });

  describe('get_app', () => {
    it('should get app details', async () => {
      const tool = getAppTool(mockServer, () => mockClient);
      const result = await tool.handler({ app_name: 'test-app' });

      expect(result.content[0].text).toContain('test-app');
      expect(mockClient.getApp).toHaveBeenCalledWith('test-app');
    });

    it('should return error when app_name is missing', async () => {
      const tool = getAppTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('create_app', () => {
    it('should create an app', async () => {
      const tool = createAppTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'new-app',
        org_slug: 'personal',
      });

      expect(result.content[0].text).toContain('Successfully created');
      expect(mockClient.createApp).toHaveBeenCalledWith({
        app_name: 'new-app',
        org_slug: 'personal',
        network: undefined,
      });
    });
  });

  describe('delete_app', () => {
    it('should delete an app', async () => {
      const tool = deleteAppTool(mockServer, () => mockClient);
      const result = await tool.handler({ app_name: 'test-app' });

      expect(result.content[0].text).toContain('Successfully deleted');
      expect(mockClient.deleteApp).toHaveBeenCalledWith('test-app', false);
    });
  });

  describe('list_machines', () => {
    it('should list machines in an app', async () => {
      const tool = listMachinesTool(mockServer, () => mockClient);
      const result = await tool.handler({ app_name: 'test-app' });

      expect(result.content[0].text).toContain('test-machine');
      expect(mockClient.listMachines).toHaveBeenCalledWith('test-app');
    });
  });

  describe('get_machine', () => {
    it('should get machine details', async () => {
      const tool = getMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('test-machine');
      expect(result.content[0].text).toContain('nginx:latest');
      expect(mockClient.getMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });

  describe('create_machine', () => {
    it('should create a machine', async () => {
      const tool = createMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        image: 'nginx:latest',
      });

      expect(result.content[0].text).toContain('Successfully created');
      expect(mockClient.createMachine).toHaveBeenCalled();
    });

    it('should create a machine with all options', async () => {
      const tool = createMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        name: 'custom-machine',
        region: 'lax',
        image: 'nginx:latest',
        cpus: 2,
        memory_mb: 512,
        cpu_kind: 'performance',
        env: { PORT: '8080' },
      });

      expect(result.content[0].text).toContain('Successfully created');
      expect(mockClient.createMachine).toHaveBeenCalledWith('test-app', {
        name: 'custom-machine',
        region: 'lax',
        skip_launch: undefined,
        config: {
          image: 'nginx:latest',
          env: { PORT: '8080' },
          auto_destroy: undefined,
          guest: {
            cpus: 2,
            memory_mb: 512,
            cpu_kind: 'performance',
          },
        },
      });
    });
  });

  describe('update_machine', () => {
    it('should update a machine', async () => {
      const tool = updateMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
        image: 'nginx:v2',
      });

      expect(result.content[0].text).toContain('Successfully updated');
      expect(mockClient.updateMachine).toHaveBeenCalled();
    });
  });

  describe('delete_machine', () => {
    it('should delete a machine', async () => {
      const tool = deleteMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Successfully deleted');
      expect(mockClient.deleteMachine).toHaveBeenCalledWith('test-app', 'test-machine-id', false);
    });
  });

  describe('start_machine', () => {
    it('should start a machine', async () => {
      const tool = startMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Successfully started');
      expect(mockClient.startMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });

  describe('stop_machine', () => {
    it('should stop a machine', async () => {
      const tool = stopMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Successfully stopped');
      expect(mockClient.stopMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });
});
