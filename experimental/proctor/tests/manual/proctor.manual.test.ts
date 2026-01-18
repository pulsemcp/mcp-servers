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
        PROCTOR_BASE_URL: process.env.PROCTOR_BASE_URL!,
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
      expect(toolNames).toContain('save_result');
      expect(toolNames).toContain('get_prior_result');
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

      // Parse the response content
      const content = result.content[0];
      expect(content.type).toBe('text');

      const metadata = JSON.parse(content.text);
      console.log('Parsed metadata:', JSON.stringify(metadata, null, 2));

      // Check that we have runtimes and exams
      expect(metadata.runtimes).toBeDefined();
      expect(Array.isArray(metadata.runtimes)).toBe(true);
      expect(metadata.exams).toBeDefined();
      expect(Array.isArray(metadata.exams)).toBe(true);

      console.log(`Found ${metadata.runtimes.length} runtimes`);
      console.log(`Found ${metadata.exams.length} exams`);

      // Log runtime details
      if (metadata.runtimes.length > 0) {
        console.log('Runtimes:', metadata.runtimes);
      }

      // Log exam details
      if (metadata.exams.length > 0) {
        console.log(
          'Exams:',
          metadata.exams.map((e: { name: string }) => e.name)
        );
      }
    }, 30000);
  });

  describe('get_machines', () => {
    it('should list active machines (may be empty)', async () => {
      const result = await client.callTool('get_machines', {});

      console.log('Machines result:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const content = result.content[0];
      expect(content.type).toBe('text');

      const machines = JSON.parse(content.text);
      console.log('Parsed machines:', JSON.stringify(machines, null, 2));

      expect(Array.isArray(machines)).toBe(true);
      console.log(`Found ${machines.length} active machines`);
    }, 30000);
  });

  describe('run_exam', () => {
    it('should execute an exam against an MCP server', async () => {
      // First get metadata to find available exams
      const metadataResult = await client.callTool('get_proctor_metadata', {});
      const metadata = JSON.parse(metadataResult.content[0].text);

      if (metadata.exams.length === 0) {
        console.log('No exams available, skipping test');
        return;
      }

      if (metadata.runtimes.length === 0) {
        console.log('No runtimes available, skipping test');
        return;
      }

      const examName = metadata.exams[0].name;
      const runtime = metadata.runtimes[0];

      console.log(`Running exam: ${examName} with runtime: ${runtime}`);

      // Run the exam against a test MCP server
      // Using a simple echo server configuration for testing
      const result = await client.callTool('run_exam', {
        exam_name: examName,
        runtime: runtime,
        mcp_server_command: 'npx',
        mcp_server_args: ['-y', '@anthropics/mcp-server-time'],
      });

      console.log('Run exam result:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      // The result should be NDJSON streamed content
      const content = result.content[0];
      expect(content.type).toBe('text');

      // Parse NDJSON lines
      const lines = content.text.trim().split('\n');
      console.log(`Received ${lines.length} NDJSON lines`);

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          console.log('NDJSON line:', JSON.stringify(parsed, null, 2));
        } catch {
          console.log('Non-JSON line:', line);
        }
      }
    }, 300000); // 5 minute timeout for exam execution
  });

  describe('get_prior_result', () => {
    it('should handle request for non-existent result', async () => {
      const result = await client.callTool('get_prior_result', {
        mirror_id: 99999, // Non-existent mirror ID
        exam_id: 'non-existent-exam',
      });

      console.log('Prior result response:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Should either return an error or "no prior result found" message
      const content = result.content[0];
      expect(content.type).toBe('text');
    }, 30000);
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
    }, 30000);
  });
});
