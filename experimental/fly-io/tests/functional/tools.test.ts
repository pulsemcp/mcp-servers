import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import { restartMachineTool } from '../../shared/src/tools/restart-machine.js';
import { suspendMachineTool } from '../../shared/src/tools/suspend-machine.js';
import { waitMachineTool } from '../../shared/src/tools/wait-machine.js';
import { getMachineEventsTool } from '../../shared/src/tools/get-machine-events.js';
import { getLogsTool } from '../../shared/src/tools/get-logs.js';
import { machineExecTool } from '../../shared/src/tools/machine-exec.js';
import { createRegisterTools, parseEnabledToolGroups } from '../../shared/src/tools.js';
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

  describe('restart_machine', () => {
    it('should restart a machine', async () => {
      const tool = restartMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Successfully restarted');
      expect(mockClient.restartMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });

  describe('suspend_machine', () => {
    it('should suspend a machine', async () => {
      const tool = suspendMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Successfully suspended');
      expect(mockClient.suspendMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });

  describe('wait_machine', () => {
    it('should wait for a machine to reach a state', async () => {
      const tool = waitMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
        state: 'started',
      });

      expect(result.content[0].text).toContain('reached state');
      expect(mockClient.waitMachine).toHaveBeenCalledWith(
        'test-app',
        'test-machine-id',
        'started',
        undefined
      );
    });

    it('should accept a timeout parameter', async () => {
      const tool = waitMachineTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
        state: 'stopped',
        timeout: 30,
      });

      expect(result.content[0].text).toContain('reached state');
      expect(mockClient.waitMachine).toHaveBeenCalledWith(
        'test-app',
        'test-machine-id',
        'stopped',
        30
      );
    });
  });

  describe('get_machine_events', () => {
    it('should get machine events', async () => {
      const tool = getMachineEventsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Events for machine');
      expect(result.content[0].text).toContain('start');
      expect(result.content[0].text).toContain('exit');
      expect(mockClient.getMachine).toHaveBeenCalledWith('test-app', 'test-machine-id');
    });
  });

  describe('get_logs', () => {
    it('should get logs for an app', async () => {
      const tool = getLogsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
      });

      expect(result.content[0].text).toContain('Application started');
      expect(mockClient.getLogs).toHaveBeenCalledWith('test-app', {
        region: undefined,
        machineId: undefined,
      });
    });

    it('should accept region and machine_id filters', async () => {
      const tool = getLogsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        region: 'iad',
        machine_id: 'test-machine-id',
      });

      expect(result.content[0].text).toContain('Application started');
      expect(mockClient.getLogs).toHaveBeenCalledWith('test-app', {
        region: 'iad',
        machineId: 'test-machine-id',
      });
    });
  });

  describe('machine_exec', () => {
    it('should execute a command on a machine', async () => {
      const tool = machineExecTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
        command: 'ls -la',
      });

      expect(result.content[0].text).toContain('command output');
      expect(mockClient.execCommand).toHaveBeenCalledWith(
        'test-app',
        'test-machine-id',
        'ls -la',
        undefined
      );
    });

    it('should accept a timeout parameter', async () => {
      const tool = machineExecTool(mockServer, () => mockClient);
      const result = await tool.handler({
        app_name: 'test-app',
        machine_id: 'test-machine-id',
        command: 'long-running-command',
        timeout: 60,
      });

      expect(result.content[0].text).toContain('command output');
      expect(mockClient.execCommand).toHaveBeenCalledWith(
        'test-app',
        'test-machine-id',
        'long-running-command',
        60
      );
    });
  });
});

describe('parseEnabledToolGroups', () => {
  it('should return all groups when no parameter is provided', () => {
    const result = parseEnabledToolGroups();
    expect(result).toContain('readonly');
    expect(result).toContain('write');
    expect(result).toContain('admin');
    expect(result).toContain('apps');
    expect(result).toContain('machines');
    expect(result).toContain('logs');
    expect(result).toContain('ssh');
  });

  it('should return all groups when empty string is provided', () => {
    const result = parseEnabledToolGroups('');
    expect(result).toContain('readonly');
    expect(result).toContain('admin');
    expect(result).toContain('machines');
  });

  it('should parse valid permission groups', () => {
    const result = parseEnabledToolGroups('readonly,write');
    expect(result).toContain('readonly');
    expect(result).toContain('write');
    expect(result).not.toContain('admin');
  });

  it('should parse valid feature groups', () => {
    const result = parseEnabledToolGroups('apps,logs');
    expect(result).toContain('apps');
    expect(result).toContain('logs');
    expect(result).not.toContain('machines');
  });

  it('should handle case-insensitivity', () => {
    const result = parseEnabledToolGroups('READONLY,MACHINES');
    expect(result).toContain('readonly');
    expect(result).toContain('machines');
  });

  it('should handle whitespace around group names', () => {
    const result = parseEnabledToolGroups('  readonly , write  ');
    expect(result).toContain('readonly');
    expect(result).toContain('write');
  });

  it('should filter out invalid groups while keeping valid ones', () => {
    const result = parseEnabledToolGroups('readonly,invalid_group,machines');
    expect(result).toContain('readonly');
    expect(result).toContain('machines');
    expect(result).not.toContain('invalid_group');
    expect(result.length).toBe(2);
  });

  it('should throw error when all groups are invalid (fail-closed)', () => {
    expect(() => parseEnabledToolGroups('invalid1,invalid2')).toThrow(
      /Invalid ENABLED_TOOLGROUPS.*No valid tool groups found/
    );
  });

  it('should throw error with valid groups listed in error message', () => {
    expect(() => parseEnabledToolGroups('foo,bar')).toThrow(/readonly, write, admin/);
  });
});

describe('Feature Groups (ENABLED_TOOLGROUPS)', () => {
  let mockClient: ReturnType<typeof createMockFlyIOClient>;
  let listToolsHandler: () => Promise<{
    tools: Array<{ name: string; description: string; inputSchema: object }>;
  }>;

  beforeEach(() => {
    mockClient = createMockFlyIOClient();
    listToolsHandler = undefined as unknown as typeof listToolsHandler;
  });

  const setupServer = (enabledGroups?: string[]) => {
    const mockServer = {
      setRequestHandler: vi.fn((schema: unknown, handler: (req: unknown) => Promise<unknown>) => {
        const schemaObj = schema as {
          def?: { shape?: { method?: { def?: { values?: string[] } } } };
        };
        const method = schemaObj?.def?.shape?.method?.def?.values?.[0];
        if (method === 'tools/list') {
          listToolsHandler = handler as typeof listToolsHandler;
        }
      }),
    } as unknown as Server;

    const registerTools = createRegisterTools(() => mockClient, {
      enabledGroups: enabledGroups as never,
    });
    registerTools(mockServer);
  };

  describe('when no groups specified (default)', () => {
    it('should include all tools', async () => {
      setupServer(undefined);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_logs');
      expect(toolNames).toContain('machine_exec');
      expect(toolNames).toContain('delete_app');
      expect(toolNames).toContain('delete_machine');
    });
  });

  describe('permission groups', () => {
    it('should filter to readonly tools', async () => {
      setupServer(['readonly']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Readonly tools should be present
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_machine');
      expect(toolNames).toContain('get_logs');
      // Write and admin tools should NOT be present
      expect(toolNames).not.toContain('create_app');
      expect(toolNames).not.toContain('delete_app');
      expect(toolNames).not.toContain('start_machine');
      expect(toolNames).not.toContain('machine_exec');
    });

    it('should filter to readonly,write tools', async () => {
      setupServer(['readonly', 'write']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Readonly and write tools should be present
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('create_app');
      expect(toolNames).toContain('start_machine');
      expect(toolNames).toContain('machine_exec');
      // Admin tools should NOT be present
      expect(toolNames).not.toContain('delete_app');
      expect(toolNames).not.toContain('delete_machine');
    });
  });

  describe('feature groups', () => {
    it('should filter to apps feature only', async () => {
      setupServer(['apps']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // App tools should be present
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
      expect(toolNames).toContain('create_app');
      expect(toolNames).toContain('delete_app');
      // Non-app tools should NOT be present
      expect(toolNames).not.toContain('list_machines');
      expect(toolNames).not.toContain('get_logs');
      expect(toolNames).not.toContain('machine_exec');
    });

    it('should filter to machines feature only', async () => {
      setupServer(['machines']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Machine tools should be present
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_machine');
      expect(toolNames).toContain('create_machine');
      expect(toolNames).toContain('delete_machine');
      // Non-machine tools should NOT be present
      expect(toolNames).not.toContain('list_apps');
      expect(toolNames).not.toContain('get_logs');
      expect(toolNames).not.toContain('machine_exec');
    });

    it('should filter to logs feature only', async () => {
      setupServer(['logs']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('get_logs');
      expect(toolNames).not.toContain('list_apps');
      expect(toolNames).not.toContain('list_machines');
      expect(toolNames).not.toContain('machine_exec');
    });

    it('should filter to ssh feature only', async () => {
      setupServer(['ssh']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('machine_exec');
      expect(toolNames).not.toContain('list_apps');
      expect(toolNames).not.toContain('list_machines');
      expect(toolNames).not.toContain('get_logs');
    });

    it('should combine multiple features', async () => {
      setupServer(['machines', 'logs']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_logs');
      expect(toolNames).not.toContain('list_apps');
      expect(toolNames).not.toContain('machine_exec');
    });
  });

  describe('combined permission and feature groups', () => {
    it('should filter by both permission and feature', async () => {
      setupServer(['readonly', 'machines']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Readonly machine tools should be present
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_machine');
      expect(toolNames).toContain('get_machine_events');
      // Write machine tools should NOT be present
      expect(toolNames).not.toContain('create_machine');
      expect(toolNames).not.toContain('start_machine');
      // App tools should NOT be present
      expect(toolNames).not.toContain('list_apps');
    });

    it('should filter to readonly apps and logs', async () => {
      setupServer(['readonly', 'apps', 'logs']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Readonly app tools should be present
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
      // Readonly logs should be present
      expect(toolNames).toContain('get_logs');
      // Write/admin app tools should NOT be present
      expect(toolNames).not.toContain('create_app');
      expect(toolNames).not.toContain('delete_app');
      // Machine tools should NOT be present
      expect(toolNames).not.toContain('list_machines');
    });

    it('should filter to write ssh only', async () => {
      setupServer(['write', 'ssh']);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      // Write ssh (machine_exec) should be present
      expect(toolNames).toContain('machine_exec');
      // Nothing else should be present
      expect(toolNames.length).toBe(1);
    });
  });
});

describe('App Scoping (FLY_IO_APP_NAME)', () => {
  let mockClient: ReturnType<typeof createMockFlyIOClient>;
  let listToolsHandler: () => Promise<{
    tools: Array<{ name: string; description: string; inputSchema: object }>;
  }>;
  let callToolHandler: (request: {
    params: { name: string; arguments?: unknown };
  }) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

  beforeEach(() => {
    mockClient = createMockFlyIOClient();
    // Reset handlers
    listToolsHandler = undefined as unknown as typeof listToolsHandler;
    callToolHandler = undefined as unknown as typeof callToolHandler;
  });

  const setupServer = (scopedAppName?: string) => {
    const mockServer = {
      setRequestHandler: vi.fn((schema: unknown, handler: (req: unknown) => Promise<unknown>) => {
        // Extract method name from zod schema: schema.def.shape.method.def.values[0]
        const schemaObj = schema as {
          def?: { shape?: { method?: { def?: { values?: string[] } } } };
        };
        const method = schemaObj?.def?.shape?.method?.def?.values?.[0];
        if (method === 'tools/list') {
          listToolsHandler = handler as typeof listToolsHandler;
        } else if (method === 'tools/call') {
          callToolHandler = handler as typeof callToolHandler;
        }
      }),
    } as unknown as Server;

    const registerTools = createRegisterTools(() => mockClient, { scopedAppName });
    registerTools(mockServer);
  };

  describe('when FLY_IO_APP_NAME is set', () => {
    it('should disable app management tools', async () => {
      setupServer('my-scoped-app');
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).not.toContain('list_apps');
      expect(toolNames).not.toContain('get_app');
      expect(toolNames).not.toContain('create_app');
      expect(toolNames).not.toContain('delete_app');
    });

    it('should keep machine tools enabled', async () => {
      setupServer('my-scoped-app');
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_machine');
      expect(toolNames).toContain('create_machine');
      expect(toolNames).toContain('start_machine');
      expect(toolNames).toContain('get_logs');
      expect(toolNames).toContain('machine_exec');
    });

    it('should update tool descriptions to note scoping', async () => {
      setupServer('my-scoped-app');
      const result = await listToolsHandler();

      const listMachines = result.tools.find((t) => t.name === 'list_machines');
      expect(listMachines?.description).toContain('scoped to app "my-scoped-app"');
    });

    it('should make app_name optional in schema', async () => {
      setupServer('my-scoped-app');
      const result = await listToolsHandler();

      const listMachines = result.tools.find((t) => t.name === 'list_machines');
      const schema = listMachines?.inputSchema as { required?: string[] };
      expect(schema.required || []).not.toContain('app_name');
    });

    it('should inject app_name when not provided', async () => {
      setupServer('my-scoped-app');
      await callToolHandler({
        params: { name: 'list_machines', arguments: {} },
      });

      expect(mockClient.listMachines).toHaveBeenCalledWith('my-scoped-app');
    });

    it('should allow matching app_name', async () => {
      setupServer('my-scoped-app');
      await callToolHandler({
        params: { name: 'list_machines', arguments: { app_name: 'my-scoped-app' } },
      });

      expect(mockClient.listMachines).toHaveBeenCalledWith('my-scoped-app');
    });

    it('should reject mismatched app_name', async () => {
      setupServer('my-scoped-app');
      const result = await callToolHandler({
        params: { name: 'list_machines', arguments: { app_name: 'different-app' } },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scoped to app "my-scoped-app"');
      expect(result.content[0].text).toContain('Cannot operate on app "different-app"');
      expect(mockClient.listMachines).not.toHaveBeenCalled();
    });

    it('should allow case-insensitive app_name matching', async () => {
      setupServer('my-scoped-app');
      await callToolHandler({
        params: { name: 'list_machines', arguments: { app_name: 'MY-SCOPED-APP' } },
      });

      expect(mockClient.listMachines).toHaveBeenCalledWith('my-scoped-app');
    });

    it('should preserve other required params while making app_name optional', async () => {
      setupServer('my-scoped-app');
      const result = await listToolsHandler();

      const machineExec = result.tools.find((t) => t.name === 'machine_exec');
      const schema = machineExec?.inputSchema as { required?: string[] };
      // app_name should NOT be required
      expect(schema.required || []).not.toContain('app_name');
      // But machine_id and command should still be required
      expect(schema.required).toContain('machine_id');
      expect(schema.required).toContain('command');
    });
  });

  describe('when FLY_IO_APP_NAME is empty string', () => {
    it('should treat empty string as unset', async () => {
      setupServer('');
      const result = await listToolsHandler();

      // Should have all tools including app management
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
    });

    it('should treat whitespace-only string as unset', async () => {
      setupServer('   ');
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_apps');
    });
  });

  describe('when FLY_IO_APP_NAME is not set', () => {
    it('should include all tools', async () => {
      setupServer(undefined);
      const result = await listToolsHandler();

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
      expect(toolNames).toContain('create_app');
      expect(toolNames).toContain('delete_app');
      expect(toolNames).toContain('list_machines');
    });

    it('should require app_name for machine tools', async () => {
      setupServer(undefined);
      const result = await listToolsHandler();

      const listMachines = result.tools.find((t) => t.name === 'list_machines');
      const schema = listMachines?.inputSchema as { required?: string[] };
      expect(schema.required).toContain('app_name');
    });
  });
});
