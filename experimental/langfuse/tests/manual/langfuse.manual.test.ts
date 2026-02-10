import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com';
const SECRET_KEY = process.env.LANGFUSE_SECRET_KEY;
const PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY;

/**
 * End-to-end manual tests for Langfuse MCP Server.
 *
 * These tests call the real MCP server via TestMCPClient, hitting the real
 * Langfuse API. This exercises the full pipeline: MCP protocol → tool handler
 * → LangfuseClient → Langfuse API → truncation → response.
 *
 * Prerequisites:
 * 1. Set up .env with LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL
 * 2. Seed test data (including a trace with >1000 char fields for truncation)
 * 3. Run: npm run test:manual
 */
describe('Langfuse MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    if (!SECRET_KEY || !PUBLIC_KEY) {
      throw new Error(
        'LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set in .env for manual tests'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        LANGFUSE_SECRET_KEY: SECRET_KEY,
        LANGFUSE_PUBLIC_KEY: PUBLIC_KEY,
        LANGFUSE_BASE_URL: BASE_URL,
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('get_traces', () => {
    it('should list traces with default params', async () => {
      const result = await client.callTool('get_traces', {});
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('meta');
      expect(parsed.meta).toHaveProperty('totalItems');
      expect(Array.isArray(parsed.data)).toBe(true);

      console.log(`Found ${parsed.meta.totalItems} total traces, returned ${parsed.data.length}`);

      if (parsed.data.length > 0) {
        const trace = parsed.data[0];
        expect(trace).toHaveProperty('id');
        expect(trace).toHaveProperty('timestamp');
        console.log(`First trace: id=${trace.id}, name=${trace.name}`);
      }
    });

    it('should filter traces by name', async () => {
      const result = await client.callTool('get_traces', { name: 'seed-trace' });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed.data)).toBe(true);

      for (const trace of parsed.data) {
        expect(trace.name).toBe('seed-trace');
      }
      console.log(`Found ${parsed.data.length} traces with name "seed-trace"`);
    });
  });

  describe('get_trace_detail', () => {
    it('should get trace detail for a known trace', async () => {
      // First get a trace ID
      const listResult = await client.callTool('get_traces', { limit: 1 });
      const listParsed = JSON.parse(listResult.content[0].text);

      if (listParsed.data.length === 0) {
        throw new Error('No traces available - cannot test get_trace_detail');
      }

      const traceId = listParsed.data[0].id;
      const result = await client.callTool('get_trace_detail', { traceId });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(traceId);
      expect(parsed).toHaveProperty('observations');
      expect(parsed).toHaveProperty('scores');
      expect(Array.isArray(parsed.observations)).toBe(true);
      expect(Array.isArray(parsed.scores)).toBe(true);

      console.log(
        `Trace ${traceId}: ${parsed.observations.length} observations, ${parsed.scores.length} scores`
      );
    });
  });

  describe('get_observations', () => {
    it('should list observations', async () => {
      const result = await client.callTool('get_observations', { limit: 5 });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('meta');
      expect(Array.isArray(parsed.data)).toBe(true);

      console.log(
        `Found ${parsed.meta.totalItems} total observations, returned ${parsed.data.length}`
      );
    });

    it('should filter observations by traceId', async () => {
      // First get a trace ID
      const tracesResult = await client.callTool('get_traces', { limit: 1 });
      const tracesParsed = JSON.parse(tracesResult.content[0].text);

      if (tracesParsed.data.length === 0) {
        throw new Error('No traces available - cannot test observations by traceId');
      }

      const traceId = tracesParsed.data[0].id;
      const result = await client.callTool('get_observations', { traceId, limit: 10 });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsed.data)).toBe(true);

      for (const obs of parsed.data) {
        expect(obs.traceId).toBe(traceId);
      }
      console.log(`Found ${parsed.data.length} observations for trace ${traceId}`);
    });
  });

  describe('get_observation', () => {
    it('should get observation detail', async () => {
      const listResult = await client.callTool('get_observations', { limit: 1 });
      const listParsed = JSON.parse(listResult.content[0].text);

      if (listParsed.data.length === 0) {
        throw new Error('No observations available - cannot test get_observation');
      }

      const obsId = listParsed.data[0].id;
      const result = await client.callTool('get_observation', { observationId: obsId });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(obsId);
      expect(parsed).toHaveProperty('type');
      expect(parsed).toHaveProperty('startTime');
      console.log(`Observation ${obsId}: type=${parsed.type}, model=${parsed.model}`);
    });
  });

  describe('truncation - save large data to /tmp files', () => {
    it('should truncate large fields in trace detail and save to /tmp', async () => {
      // Find a trace with large input/output (seeded with name "seed-truncation-trace")
      const listResult = await client.callTool('get_traces', {
        name: 'seed-truncation-trace',
        limit: 1,
      });
      const listParsed = JSON.parse(listResult.content[0].text);

      if (listParsed.data.length === 0) {
        throw new Error(
          'No truncation test trace found. Seed one with: node -e "..." (see README for seeding instructions)'
        );
      }

      const traceId = listParsed.data[0].id;
      console.log(`Testing truncation with trace: ${traceId}`);

      // Get trace detail - this should trigger truncation on input/output fields
      const result = await client.callTool('get_trace_detail', { traceId });
      expect(result.isError).toBeFalsy();

      const responseText = result.content[0].text;
      const parsed = JSON.parse(responseText);

      // The trace's input field should be truncated (it was seeded with >1000 chars)
      const inputField =
        typeof parsed.input === 'string' ? parsed.input : JSON.stringify(parsed.input);
      expect(inputField).toContain('TRUNCATED');
      expect(inputField).toContain('/tmp/langfuse_');
      expect(inputField).toContain('use grep to search it');

      // Extract the /tmp file path and verify it exists with full content
      const pathMatch = inputField.match(/\/tmp\/langfuse_\S+\.txt/);
      expect(pathMatch).not.toBeNull();
      expect(existsSync(pathMatch![0])).toBe(true);

      const savedContent = readFileSync(pathMatch![0], 'utf-8');
      expect(savedContent.length).toBeGreaterThan(1000);
      console.log(
        `Truncation verified: input field saved to ${pathMatch![0]} (${savedContent.length} chars)`
      );

      // The output field should also be truncated
      const outputField =
        typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output);
      expect(outputField).toContain('TRUNCATED');
      expect(outputField).toContain('/tmp/langfuse_');

      const outputPathMatch = outputField.match(/\/tmp\/langfuse_\S+\.txt/);
      expect(outputPathMatch).not.toBeNull();
      expect(existsSync(outputPathMatch![0])).toBe(true);
      console.log(`Truncation verified: output field saved to ${outputPathMatch![0]}`);
    });

    it('should truncate large fields in observation detail and save to /tmp', async () => {
      // Find observations from the truncation test trace
      const listResult = await client.callTool('get_traces', {
        name: 'seed-truncation-trace',
        limit: 1,
      });
      const listParsed = JSON.parse(listResult.content[0].text);

      if (listParsed.data.length === 0) {
        throw new Error('No truncation test trace found');
      }

      const traceId = listParsed.data[0].id;

      // Get observations for this trace
      const obsListResult = await client.callTool('get_observations', { traceId, limit: 1 });
      const obsListParsed = JSON.parse(obsListResult.content[0].text);

      if (obsListParsed.data.length === 0) {
        throw new Error('No observations found for truncation test trace');
      }

      const obsId = obsListParsed.data[0].id;
      console.log(`Testing truncation with observation: ${obsId}`);

      // Get observation detail - should trigger truncation
      const result = await client.callTool('get_observation', { observationId: obsId });
      expect(result.isError).toBeFalsy();

      const parsed = JSON.parse(result.content[0].text);

      // The observation's input field should be truncated
      const inputField =
        typeof parsed.input === 'string' ? parsed.input : JSON.stringify(parsed.input);
      expect(inputField).toContain('TRUNCATED');
      expect(inputField).toContain('/tmp/langfuse_');

      // Verify the /tmp file exists and has full content
      const pathMatch = inputField.match(/\/tmp\/langfuse_\S+\.txt/);
      expect(pathMatch).not.toBeNull();
      expect(existsSync(pathMatch![0])).toBe(true);

      const savedContent = readFileSync(pathMatch![0], 'utf-8');
      expect(savedContent.length).toBeGreaterThan(1000);
      console.log(
        `Observation truncation verified: input saved to ${pathMatch![0]} (${savedContent.length} chars)`
      );
    });
  });
});
