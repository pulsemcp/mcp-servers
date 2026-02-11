import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for PulseMCP CMS Admin MCP Server - find_providers tool
 *
 * Prerequisites:
 * - PULSEMCP_ADMIN_API_KEY environment variable set
 * - Optionally PULSEMCP_ADMIN_API_URL for custom API endpoint
 *
 * Run with: npm run test:manual
 */
describe('find_providers manual tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const apiKey = process.env.PULSEMCP_ADMIN_API_KEY;
    if (!apiKey) {
      throw new Error('PULSEMCP_ADMIN_API_KEY environment variable is required for manual tests');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {
      PULSEMCP_ADMIN_API_KEY: apiKey,
    };

    if (process.env.PULSEMCP_ADMIN_API_URL) {
      env.PULSEMCP_ADMIN_API_URL = process.env.PULSEMCP_ADMIN_API_URL;
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('searchProviders', () => {
    it('should search for providers by query', async () => {
      const result = await client.callTool('find_providers', {
        query: 'anthropic',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`find_providers "anthropic" response length: ${text.length} chars`);
    });

    it('should support pagination with limit and offset', async () => {
      const result = await client.callTool('find_providers', {
        query: 'a',
        limit: 5,
        offset: 0,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`find_providers pagination response length: ${text.length} chars`);
    });

    it('should handle empty search results', async () => {
      const result = await client.callTool('find_providers', {
        query: 'xyznonexistentprovider12345',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`find_providers empty search response length: ${text.length} chars`);
    });

    it('should search across different fields', async () => {
      const result = await client.callTool('find_providers', {
        query: 'model',
        limit: 5,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`find_providers "model" response length: ${text.length} chars`);
    });
  });
});
