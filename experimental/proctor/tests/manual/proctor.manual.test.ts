import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Proctor MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    // Build path to the server entry point using resolve for proper path
    const serverPath = resolve(__dirname, '../../local/build/index.js');
    console.log('Server path:', serverPath);

    client = new TestMCPClient({
      serverPath,
      env: {
        ...process.env,
        PROCTOR_API_KEY: process.env.PROCTOR_API_KEY!,
        PROCTOR_API_URL: process.env.PROCTOR_API_URL!,
      },
      debug: true,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const result = await client.listTools();
      console.log(
        'Available tools:',
        result.tools.map((t) => t.name)
      );

      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);

      // Check for expected tools
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('get_proctor_metadata');
      expect(toolNames).toContain('run_exam');
      expect(toolNames).toContain('get_machines');
      expect(toolNames).toContain('destroy_machine');
      expect(toolNames).toContain('cancel_exam');
    });
  });

  describe('get_proctor_metadata', () => {
    it('should retrieve available runtimes and exams', async () => {
      const result = await client.callTool('get_proctor_metadata', {});

      console.log('Metadata result:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBe(false);

      // Parse the response content - it's markdown formatted
      const content = result.content[0];
      expect(content.type).toBe('text');

      // Verify we got runtimes and exams in the markdown response
      expect(content.text).toContain('## Available Proctor Runtimes');
      expect(content.text).toContain('## Available Exams');
      expect(content.text).toContain('proctor-mcp-client');

      console.log('Metadata response received successfully');
    }, 30000);
  });

  describe('get_machines', () => {
    it('should list active machines (may be empty)', async () => {
      const result = await client.callTool('get_machines', {});

      console.log('Machines result:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBe(false);

      const content = result.content[0];
      expect(content.type).toBe('text');

      // The response is markdown formatted, check for expected format
      // May have 0 or more machines
      expect(
        content.text.includes('## Active Machines') || content.text.includes('No active machines')
      ).toBe(true);

      console.log('Machines response received successfully');
    }, 30000);
  });

  describe('run_exam', () => {
    it('should run an exam against an MCP server', async () => {
      // Test running an exam with a simple mcp.json config
      const examId = 'proctor-mcp-client-init-tools-list';
      const runtimeId = 'proctor-mcp-client-0.0.37-configs-0.0.10';

      // Sample mcp.json configuration for testing
      const mcpConfig = JSON.stringify({
        mcpServers: {
          test: {
            command: 'echo',
            args: ['test'],
          },
        },
      });

      console.log(`Running exam: ${examId} with runtime: ${runtimeId}`);

      const result = await client.callTool('run_exam', {
        runtime_id: runtimeId,
        exam_id: examId,
        mcp_json: mcpConfig,
      });

      console.log('Run exam response:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const content = result.content[0];
      expect(content.type).toBe('text');

      // The exam might succeed, fail, or return an error depending on API state
      // Either way, we verify the API responded properly
      if (result.isError) {
        console.log('Run exam returned error:', content.text);
        // API responded with an error - this is valid behavior
        expect(content.text).toContain('Error');
      } else {
        console.log('Run exam succeeded:', content.text);
        expect(content.text).toContain('Exam Execution');
      }
    }, 120000); // 2 minute timeout for exam execution
  });

  describe('cancel_exam', () => {
    it('should handle cancel request for non-running exam', async () => {
      const result = await client.callTool('cancel_exam', {
        machine_id: 'non-existent-machine-12345',
        exam_id: 'non-existent-exam',
      });

      console.log('Cancel exam response:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Should return an error for non-existent machine
      const content = result.content[0];
      expect(content.type).toBe('text');
      expect(result.isError).toBe(true);
    }, 30000);
  });

  describe('destroy_machine', () => {
    it('should handle destroy request for non-existent machine', async () => {
      const result = await client.callTool('destroy_machine', {
        machine_id: 'non-existent-machine-12345',
      });

      console.log('Destroy machine response:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Should return an error for non-existent machine
      const content = result.content[0];
      expect(content.type).toBe('text');
      expect(result.isError).toBe(true);
    }, 30000);
  });
});
