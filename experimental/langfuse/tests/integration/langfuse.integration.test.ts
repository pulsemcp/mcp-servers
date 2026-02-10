import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Langfuse MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      client = await createTestMCPClientWithMock({});

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('langfuse-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list all four tools', async () => {
      client = await createTestMCPClientWithMock({});

      const tools = await client.listTools();
      expect(tools).toHaveLength(4);
      const names = tools.map((t: { name: string }) => t.name);
      expect(names).toContain('get_traces');
      expect(names).toContain('get_trace_detail');
      expect(names).toContain('get_observations');
      expect(names).toContain('get_observation');
    });

    it('should execute get_traces', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_traces', {});
      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toBeDefined();
      expect(parsed.meta).toBeDefined();
    });

    it('should execute get_trace_detail', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_trace_detail', { traceId: 'trace-1' });
      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe('trace-1');
      expect(parsed.observations).toBeDefined();
    });

    it('should execute get_observations', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_observations', { traceId: 'trace-1' });
      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toBeDefined();
      expect(parsed.meta).toBeDefined();
    });

    it('should execute get_observation', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.callTool('get_observation', { observationId: 'obs-1' });
      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe('obs-1');
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      client = await createTestMCPClientWithMock({});

      const resources = await client.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('langfuse://config');
    });

    it('should read config resource', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.readResource('langfuse://config');
      expect(result.contents[0]).toMatchObject({
        uri: 'langfuse://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text);
      expect(config.server.name).toBe('langfuse-mcp-server');
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
      LANGFUSE_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
