import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Use override: true to ensure .env values take precedence over any
// pre-existing environment variables (e.g. empty ANTHROPIC_API_KEY)
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Extract text from MCP content item (handles both resource and text types) */
function getContentText(content: {
  type: string;
  resource?: { text: string };
  text?: string;
}): string {
  return content.type === 'resource' ? content.resource!.text : content.text!;
}

describe('Extract Functionality via MCP', () => {
  const extractQuery = 'Extract the main heading and any description text from this page';

  describe('Anthropic Extract', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic extract tests require ANTHROPIC_API_KEY environment variable');
      }

      console.log('Testing Anthropic Extract via MCP\n');

      const serverPath = path.join(__dirname, '../../../local/build/index.js');
      client = new TestMCPClient({
        serverPath,
        env: {
          ANTHROPIC_API_KEY: apiKey,
          SKIP_HEALTH_CHECKS: 'true',
        },
        debug: false,
      });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.disconnect();
    });

    it('should extract information from a page', async () => {
      const result = await client.callTool('scrape', {
        url: 'https://example.com',
        extract: extractQuery,
        timeout: 30000,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
      expect(text).toBeDefined();
      expect(text).toContain('Example Domain');

      console.log('Anthropic extraction successful');
      console.log('Response:', text?.slice(0, 200));
    }, 60000);
  });

  describe('OpenAI Extract', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI extract tests require OPENAI_API_KEY environment variable');
      }

      console.log('Testing OpenAI Extract via MCP\n');

      const serverPath = path.join(__dirname, '../../../local/build/index.js');
      client = new TestMCPClient({
        serverPath,
        env: {
          OPENAI_API_KEY: apiKey,
          SKIP_HEALTH_CHECKS: 'true',
        },
        debug: false,
      });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.disconnect();
    });

    it('should extract information from a page', async () => {
      const result = await client.callTool('scrape', {
        url: 'https://example.com',
        extract: extractQuery,
        timeout: 30000,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
      expect(text).toBeDefined();
      expect(text).toContain('Example Domain');

      console.log('OpenAI extraction successful');
      console.log('Response:', text?.slice(0, 200));
    }, 60000);
  });

  describe('OpenAI-Compatible Extract', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
      const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
      const model = process.env.OPENAI_COMPATIBLE_MODEL;

      if (!apiKey || !baseUrl || !model) {
        throw new Error(
          'OpenAI-compatible extract tests require OPENAI_COMPATIBLE_API_KEY, OPENAI_COMPATIBLE_BASE_URL, and OPENAI_COMPATIBLE_MODEL environment variables'
        );
      }

      console.log('Testing OpenAI-Compatible Extract via MCP');
      console.log(`Provider: ${baseUrl}`);
      console.log(`Model: ${model}\n`);

      const serverPath = path.join(__dirname, '../../../local/build/index.js');
      client = new TestMCPClient({
        serverPath,
        env: {
          OPENAI_COMPATIBLE_API_KEY: apiKey,
          OPENAI_COMPATIBLE_BASE_URL: baseUrl,
          OPENAI_COMPATIBLE_MODEL: model,
          SKIP_HEALTH_CHECKS: 'true',
        },
        debug: false,
      });
      await client.connect();
    });

    afterAll(async () => {
      if (client) await client.disconnect();
    });

    it('should extract information from a page', async () => {
      const result = await client.callTool('scrape', {
        url: 'https://example.com',
        extract: extractQuery,
        timeout: 30000,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
      expect(text).toBeDefined();

      console.log('OpenAI-compatible extraction successful');
      console.log('Response:', text?.slice(0, 200));
    }, 60000);
  });
});
