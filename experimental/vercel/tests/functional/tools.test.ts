import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { listDeploymentsTool } from '../../shared/src/tools/list-deployments.js';
import { getDeploymentTool } from '../../shared/src/tools/get-deployment.js';
import { listProjectsTool } from '../../shared/src/tools/list-projects.js';
import { createDeploymentTool } from '../../shared/src/tools/create-deployment.js';
import { cancelDeploymentTool } from '../../shared/src/tools/cancel-deployment.js';
import { deleteDeploymentTool } from '../../shared/src/tools/delete-deployment.js';
import { promoteDeploymentTool } from '../../shared/src/tools/promote-deployment.js';
import { rollbackDeploymentTool } from '../../shared/src/tools/rollback-deployment.js';
import { getDeploymentEventsTool } from '../../shared/src/tools/get-deployment-events.js';
import { getRuntimeLogsTool } from '../../shared/src/tools/get-runtime-logs.js';
import { createRegisterTools } from '../../shared/src/tools.js';
import { createMockVercelClient } from '../mocks/vercel-client.functional-mock.js';
import type { IVercelClient } from '../../shared/src/server.js';

const mockServer = {} as Server;

describe('Tools', () => {
  let mockClient: IVercelClient;
  let clientFactory: () => IVercelClient;

  beforeEach(() => {
    mockClient = createMockVercelClient();
    clientFactory = () => mockClient;
  });

  describe('list_deployments', () => {
    it('should list deployments with no filters', async () => {
      const tool = listDeploymentsTool(mockServer, clientFactory);
      const result = await tool.handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.deployments).toHaveLength(1);
      expect(parsed.deployments[0].uid).toBe('dpl_test123');
    });

    it('should pass filter parameters to client', async () => {
      const tool = listDeploymentsTool(mockServer, clientFactory);
      await tool.handler({
        projectId: 'prj_test123',
        state: 'READY',
        target: 'production',
      });

      expect(mockClient.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'prj_test123',
          state: 'READY',
          target: 'production',
        })
      );
    });
  });

  describe('get_deployment', () => {
    it('should get deployment details', async () => {
      const tool = getDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({ idOrUrl: 'dpl_test123' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.uid).toBe('dpl_test123');
      expect(parsed.state).toBe('READY');
    });

    it('should require idOrUrl parameter', async () => {
      const tool = getDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('list_projects', () => {
    it('should list projects', async () => {
      const tool = listProjectsTool(mockServer, clientFactory);
      const result = await tool.handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.projects).toHaveLength(1);
      expect(parsed.projects[0].name).toBe('my-app');
    });
  });

  describe('create_deployment', () => {
    it('should create a deployment', async () => {
      const tool = createDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({
        name: 'my-app',
        target: 'production',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.uid).toBe('dpl_new789');
      expect(parsed.state).toBe('BUILDING');
    });

    it('should require name parameter', async () => {
      const tool = createDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('cancel_deployment', () => {
    it('should cancel a deployment', async () => {
      const tool = cancelDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({ deploymentId: 'dpl_test123' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.state).toBe('CANCELED');
    });
  });

  describe('delete_deployment', () => {
    it('should delete a deployment', async () => {
      const tool = deleteDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({ deploymentId: 'dpl_test123' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.state).toBe('DELETED');
    });
  });

  describe('promote_deployment', () => {
    it('should promote a deployment', async () => {
      const tool = promoteDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({
        projectId: 'prj_test123',
        deploymentId: 'dpl_test123',
      });

      expect(result.content[0].text).toContain('Successfully promoted');
    });
  });

  describe('rollback_deployment', () => {
    it('should rollback a deployment', async () => {
      const tool = rollbackDeploymentTool(mockServer, clientFactory);
      const result = await tool.handler({
        projectId: 'prj_test123',
        deploymentId: 'dpl_test123',
      });

      expect(result.content[0].text).toContain('Successfully rolled back');
    });
  });

  describe('get_deployment_events', () => {
    it('should get deployment build logs', async () => {
      const tool = getDeploymentEventsTool(mockServer, clientFactory);
      const result = await tool.handler({ idOrUrl: 'dpl_test123' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe('command');
    });
  });

  describe('get_runtime_logs', () => {
    it('should get runtime logs', async () => {
      const tool = getRuntimeLogsTool(mockServer, clientFactory);
      const result = await tool.handler({
        projectId: 'prj_test123',
        deploymentId: 'dpl_test123',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].source).toBe('serverless');
    });
  });

  describe('tool groups', () => {
    // Helper to capture tool names from createRegisterTools
    type ToolListHandler = (req: unknown) => Promise<{ tools: { name: string }[] }>;

    async function getRegisteredToolNames(groups: ('readonly' | 'readwrite')[]): Promise<string[]> {
      const registerTools = createRegisterTools(clientFactory, groups);

      let listToolsHandler: ToolListHandler | null = null;
      const toolServer = {
        setRequestHandler: (schema: unknown, handler: ToolListHandler) => {
          if (schema === ListToolsRequestSchema) {
            listToolsHandler = handler;
          }
        },
      } as unknown as Server;

      registerTools(toolServer);

      const result = (await listToolsHandler!({})) as { tools: { name: string }[] };
      return result.tools.map((t) => t.name);
    }

    it('should only register readonly tools when readonly group is enabled', async () => {
      const toolNames = await getRegisteredToolNames(['readonly']);

      // Should include readonly tools
      expect(toolNames).toContain('list_deployments');
      expect(toolNames).toContain('get_deployment');
      expect(toolNames).toContain('list_projects');
      expect(toolNames).toContain('get_deployment_events');
      expect(toolNames).toContain('get_runtime_logs');
      // Should NOT include readwrite-only tools
      expect(toolNames).not.toContain('create_deployment');
      expect(toolNames).not.toContain('cancel_deployment');
      expect(toolNames).not.toContain('delete_deployment');
      expect(toolNames).not.toContain('promote_deployment');
      expect(toolNames).not.toContain('rollback_deployment');
      expect(toolNames).toHaveLength(5);
    });

    it('should register all tools when both groups are enabled', async () => {
      const toolNames = await getRegisteredToolNames(['readonly', 'readwrite']);

      expect(toolNames).toContain('list_deployments');
      expect(toolNames).toContain('create_deployment');
      expect(toolNames).toContain('cancel_deployment');
      expect(toolNames).toContain('delete_deployment');
      expect(toolNames).toContain('promote_deployment');
      expect(toolNames).toContain('rollback_deployment');
      expect(toolNames).toHaveLength(10);
    });

    it('should only register readwrite tools when readwrite group is enabled', async () => {
      const toolNames = await getRegisteredToolNames(['readwrite']);

      // All 10 tools are in the readwrite group (readonly tools have both groups)
      expect(toolNames).toHaveLength(10);
      expect(toolNames).toContain('create_deployment');
      expect(toolNames).toContain('list_deployments');
    });
  });
});
