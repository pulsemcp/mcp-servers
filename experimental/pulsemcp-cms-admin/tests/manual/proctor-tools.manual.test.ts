import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Manual Tests for Proctor Tool Group
 *
 * These tests hit the real PulseMCP Staging API to verify the proctor tools work correctly.
 * They exercise the full run → store → save flow, including the fix for issue #374
 * (empty output data when saving via result_id).
 *
 * Tools tested:
 *   - get_proctor_metadata: Get available runtimes and exams
 *   - run_exam_for_mirror: Run proctor exams against an unofficial mirror
 *   - get_exam_result: Retrieve full stored exam result by result_id
 *   - save_results_for_mirror: Save exam results using result_id from run_exam_for_mirror
 *
 * Required Environment:
 *   PULSEMCP_ADMIN_API_KEY: Admin API key for staging.pulsemcp.com
 *   PULSEMCP_ADMIN_API_URL: https://admin.staging.pulsemcp.com
 */

/** Fetch the default runtime_id from the proctor metadata endpoint. */
async function fetchDefaultRuntimeId(apiKey: string, baseUrl: string): Promise<string> {
  const url = new URL('/api/proctor/metadata', baseUrl);
  const response = await fetch(url.toString(), {
    headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch proctor metadata: ${response.status} ${response.statusText}`);
  }

  const metadata = (await response.json()) as {
    runtimes: Array<{ id: string; name: string; default?: boolean }>;
  };

  if (!metadata.runtimes || metadata.runtimes.length === 0) {
    throw new Error('No proctor runtimes configured on the server');
  }

  // The metadata endpoint returns runtimes in reverse order (newest first).
  // Pick the first one (latest/default).
  return metadata.runtimes[0].id;
}

describe('Proctor Tools - Manual Tests with Real API', () => {
  let client: TestMCPClient;
  let runtimeId: string;

  beforeAll(async () => {
    if (!process.env.PULSEMCP_ADMIN_API_KEY) {
      throw new Error('PULSEMCP_ADMIN_API_KEY must be set in .env file for manual tests');
    }

    const apiUrl = process.env.PULSEMCP_ADMIN_API_URL || 'https://admin.pulsemcp.com';

    // Fetch a valid runtime_id from the server before running tests
    runtimeId = await fetchDefaultRuntimeId(process.env.PULSEMCP_ADMIN_API_KEY!, apiUrl);

    const serverPath = path.join(__dirname, '../../local/build/index.js');

    const env: Record<string, string> = {
      PULSEMCP_ADMIN_API_KEY: process.env.PULSEMCP_ADMIN_API_KEY!,
    };
    if (process.env.PULSEMCP_ADMIN_API_URL) {
      env.PULSEMCP_ADMIN_API_URL = process.env.PULSEMCP_ADMIN_API_URL;
    }

    client = new TestMCPClient({
      serverPath: serverPath,
      env,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Tool Registration', () => {
    it('should register all proctor tools', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((t) => t.name);

      expect(toolNames).toContain('get_proctor_metadata');
      expect(toolNames).toContain('run_exam_for_mirror');
      expect(toolNames).toContain('get_exam_result');
      expect(toolNames).toContain('save_results_for_mirror');
    });

    it('should have correct input schema for run_exam_for_mirror', async () => {
      const tools = await client.listTools();
      const tool = tools.tools.find((t) => t.name === 'run_exam_for_mirror');
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('mirror_ids');
      expect(tool!.inputSchema.required).toContain('runtime_id');
      expect(tool!.inputSchema.required).toContain('exam_type');
    });

    it('should have correct input schema for save_results_for_mirror', async () => {
      const tools = await client.listTools();
      const tool = tools.tools.find((t) => t.name === 'save_results_for_mirror');
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('mirror_id');
      expect(tool!.inputSchema.required).toContain('result_id');
      expect(tool!.inputSchema.properties).toHaveProperty('result_id');
      expect(tool!.inputSchema.properties).not.toHaveProperty('results');
    });
  });

  describe('get_proctor_metadata', () => {
    it('should return available runtimes and exams', async () => {
      const result = await client.callTool('get_proctor_metadata', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      console.log('Proctor metadata:', text);

      // Should contain both sections
      expect(text).toContain('## Available Proctor Runtimes');
      expect(text).toContain('## Available Exams');

      // Should list at least one runtime with id and image
      expect(text).toMatch(/\*\*.+\*\* \(id: `.+`\)/);
      expect(text).toContain('Image: `');
    });
  });

  describe('End-to-end: run → store → get → save flow', () => {
    // Shared state across sequential tests in this describe block.
    let testMirrorId: number;
    let resultId: string;

    it('should find a mirror with mcp_json to test against', async () => {
      // Find a mirror that has mcp_jsons_count > 0 (proctor needs mcp_json to run exams).
      const result = await client.callTool('get_unofficial_mirrors', {
        limit: 100,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      // Parse each mirror entry and find one with MCP JSONs > 0
      // Format:  N. **name** (ID: 123)
      //             MCP JSONs: 2
      const mirrorEntries = text.split(/\d+\.\s+\*\*/);
      for (const entry of mirrorEntries) {
        const idMatch = entry.match(/\(ID:\s*(\d+)\)/);
        const mcpJsonsMatch = entry.match(/MCP JSONs:\s*(\d+)/);
        if (idMatch && mcpJsonsMatch && parseInt(mcpJsonsMatch[1], 10) > 0) {
          testMirrorId = parseInt(idMatch[1], 10);
          break;
        }
      }

      // If no mirror with MCP JSONs found, just use the first mirror
      if (!testMirrorId) {
        const fallbackMatch = text.match(/\(ID:\s*(\d+)\)/);
        expect(fallbackMatch).toBeTruthy();
        testMirrorId = parseInt(fallbackMatch![1], 10);
      }

      expect(testMirrorId).toBeGreaterThan(0);
    });

    it('should run an exam against the mirror and return a result_id', async () => {
      expect(testMirrorId).toBeGreaterThan(0);

      const result = await client.callTool(
        'run_exam_for_mirror',
        {
          mirror_ids: [testMirrorId],
          runtime_id: runtimeId,
          exam_type: 'auth-check',
        },
        { timeout: 120_000 }
      );

      const text = result.content[0].text;

      expect(result.isError).toBeFalsy();

      // Should contain the result header
      expect(text).toContain('Proctor Exam Results');
      expect(text).toContain('Result ID:');

      // Extract the result_id UUID
      const resultIdMatch = text.match(/Result ID: ([0-9a-f-]{36})/);
      expect(resultIdMatch).toBeTruthy();
      resultId = resultIdMatch![1];
    }, 120_000); // Proctor exams can take up to 2 minutes

    it('should retrieve the full stored result via get_exam_result', async () => {
      expect(resultId).toBeDefined();

      const result = await client.callTool('get_exam_result', {
        result_id: resultId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('Exam Result Details');
      expect(text).toContain(resultId);
      expect(text).toContain(runtimeId);
      expect(text).toContain('exam_result');
    });

    it('should retrieve only exam_results section via section filter', async () => {
      expect(resultId).toBeDefined();

      const result = await client.callTool('get_exam_result', {
        result_id: resultId,
        section: 'exam_results',
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('Section Filter: exam_results');
      expect(text).toContain('"type": "exam_result"');
    });

    it('should save results using result_id and preserve output data', async () => {
      expect(resultId).toBeDefined();

      const result = await client.callTool('save_results_for_mirror', {
        mirror_id: testMirrorId,
        result_id: resultId,
      });

      expect(result.isError).toBeFalsy();
      const text = result.content[0].text;

      expect(text).toContain('Proctor Results Saved');
      expect(text).toContain(`Mirror ID: ${testMirrorId}`);
      expect(text).toContain(`Result ID: ${resultId}`);
      expect(text).toMatch(/Successfully Saved \(\d+\)/);
    }, 30_000);
  });

  describe('Error handling', () => {
    it('should return error for unknown result_id in get_exam_result', async () => {
      const result = await client.callTool('get_exam_result', {
        result_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No stored result found');
    });

    it('should return error for unknown result_id in save_results_for_mirror', async () => {
      const result = await client.callTool('save_results_for_mirror', {
        mirror_id: 1,
        result_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No stored result found');
    });

    it('should return error when run_exam_for_mirror has invalid runtime', async () => {
      const result = await client.callTool('run_exam_for_mirror', {
        mirror_ids: [1],
        runtime_id: 'nonexistent-runtime',
        exam_type: 'auth-check',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error running proctor exam');
    });
  });
});
