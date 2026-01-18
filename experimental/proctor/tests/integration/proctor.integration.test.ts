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
      expect(toolNames).toContain('save_result');
      expect(toolNames).toContain('get_prior_result');
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

  describe('run_exam', () => {
    it('should execute an exam and return results', async () => {
      client = await createTestMCPClient();
      const mcpConfig = JSON.stringify({
        'test-server': {
          type: 'streamable-http',
          url: 'https://example.com/mcp',
        },
      });

      const result = await client.callTool('run_exam', {
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_config: mcpConfig,
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Exam Execution');
      expect(text).toContain('Runtime');
      expect(text).toContain('v0.0.37');
      expect(text).toContain('Result');
    });

    it('should reject invalid mcp_config JSON', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('run_exam', {
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_config: 'not valid json',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mcp_config must be a valid JSON string');
    });

    it('should require custom_runtime_image for __custom__ runtime', async () => {
      client = await createTestMCPClient();
      const mcpConfig = JSON.stringify({ 'test-server': { type: 'streamable-http' } });

      const result = await client.callTool('run_exam', {
        runtime_id: '__custom__',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_config: mcpConfig,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('custom_runtime_image is required');
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

  describe('save_result', () => {
    it('should save exam results', async () => {
      client = await createTestMCPClient();
      const results = JSON.stringify({
        status: 'success',
        tests: [{ name: 'test1', passed: true }],
      });

      const result = await client.callTool('save_result', {
        runtime_id: 'v0.0.37',
        exam_id: 'proctor-mcp-client-init-tools-list',
        mcp_server_slug: 'test-server',
        mirror_id: 123,
        results: results,
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Result Saved');
      expect(text).toContain('Success');
    });
  });

  describe('get_prior_result', () => {
    it('should return no result when none exists', async () => {
      client = await createTestMCPClient();
      const result = await client.callTool('get_prior_result', {
        mirror_id: 999,
        exam_id: 'nonexistent-exam',
      });

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('No prior result found');
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
