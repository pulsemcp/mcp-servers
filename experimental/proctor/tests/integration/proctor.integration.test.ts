import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Proctor MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      client = await createTestMCPClient();
      const result = await client.listTools();
      const tools = result.tools;

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      // Check for expected tool names
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('get_proctor_metadata');
      expect(toolNames).toContain('run_exam');
      expect(toolNames).toContain('get_machines');
      expect(toolNames).toContain('destroy_machine');
      expect(toolNames).toContain('cancel_exam');
    });

    it('should have proper descriptions for all tools', async () => {
      client = await createTestMCPClient();
      const result = await client.listTools();
      const tools = result.tools;

      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(50);
      }
    });
  });

  describe('get_proctor_metadata', () => {
    it('should return available runtimes and exams', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('get_proctor_metadata', {});

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Available Proctor Runtimes');
      expect(text).toContain('Available Exams');
      expect(text).toContain('v0.0.37');
      expect(text).toContain('proctor-mcp-client-auth-check');
    });
  });

  describe('get_machines', () => {
    it('should list active machines', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('get_machines', {});

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Active Machines');
      expect(text).toContain('machine-123');
    });
  });

  describe('destroy_machine', () => {
    it('should destroy a machine', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('destroy_machine', {
        machine_id: 'machine-123',
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Machine Destroyed');
      expect(text).toContain('Success');
    });
  });

  describe('cancel_exam', () => {
    it('should cancel a running exam', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('cancel_exam', {
        machine_id: 'machine-123',
        exam_id: 'proctor-mcp-client-init-tools-list',
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Exam Cancellation');
    });
  });

  describe('run_exam', () => {
    it('should run an exam and return results', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('run_exam', {
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_json: '{"mcpServers":{}}',
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Exam Execution');
      expect(text).toContain('v0.0.37');
      expect(text).toContain('Logs');
      expect(text).toContain('Result');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with the mock server
 */
async function createTestMCPClient(): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    debug: false,
  });

  await client.connect();
  return client;
}
