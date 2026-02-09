import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Vercel MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list tools', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.listTools();
      expect(result.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Tools', () => {
    it('should list all available tools', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);

      // Readonly tools
      expect(toolNames).toContain('list_deployments');
      expect(toolNames).toContain('get_deployment');
      expect(toolNames).toContain('list_projects');
      expect(toolNames).toContain('get_deployment_events');
      expect(toolNames).toContain('get_runtime_logs');

      // Readwrite tools
      expect(toolNames).toContain('create_deployment');
      expect(toolNames).toContain('cancel_deployment');
      expect(toolNames).toContain('delete_deployment');
      expect(toolNames).toContain('promote_deployment');
      expect(toolNames).toContain('rollback_deployment');

      expect(result.tools).toHaveLength(10);
    });

    it('should execute list_deployments', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('list_deployments', {});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.deployments).toBeDefined();
      expect(parsed.deployments.length).toBeGreaterThan(0);
    });

    it('should execute get_deployment', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_deployment', {
        idOrUrl: 'dpl_mock123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.uid).toBe('dpl_mock123');
      expect(parsed.state).toBe('READY');
    });

    it('should execute get_runtime_logs', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_runtime_logs', {
        projectId: 'prj_mock123',
        deploymentId: 'dpl_mock123',
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].source).toBe('serverless');
    });
  });
});

async function createTestMCPClientWithMock(
  mockData: Record<string, unknown>
): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      VERCEL_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
