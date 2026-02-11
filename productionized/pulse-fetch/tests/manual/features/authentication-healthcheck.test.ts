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

describe('Authentication Health Checks via MCP', () => {
  describe('Scraping Service Authentication', () => {
    describe('Firecrawl Authentication', () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          throw new Error('Firecrawl auth test requires FIRECRAWL_API_KEY environment variable');
        }

        console.log('Testing Firecrawl Authentication');
        console.log(`Using FIRECRAWL_API_KEY: ${apiKey.substring(0, 10)}...`);

        const serverPath = path.join(__dirname, '../../../local/build/index.js');
        client = new TestMCPClient({
          serverPath,
          env: {
            FIRECRAWL_API_KEY: apiKey,
            OPTIMIZE_FOR: 'speed',
          },
          debug: false,
        });
        await client.connect();
      });

      afterAll(async () => {
        if (client) await client.disconnect();
      });

      it('should authenticate and scrape successfully with Firecrawl', async () => {
        const result = await client.callTool('scrape', {
          url: 'https://example.com',
          timeout: 30000,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);

        const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);

        console.log('Firecrawl authentication successful');
      }, 60000);
    });

    describe('BrightData Authentication', () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        const apiKey = process.env.BRIGHTDATA_API_KEY;
        if (!apiKey) {
          throw new Error('BrightData auth test requires BRIGHTDATA_API_KEY environment variable');
        }

        console.log('Testing BrightData Authentication');
        console.log(`Using BRIGHTDATA_API_KEY: ${apiKey.substring(0, 20)}...`);

        const serverPath = path.join(__dirname, '../../../local/build/index.js');
        client = new TestMCPClient({
          serverPath,
          env: {
            BRIGHTDATA_API_KEY: apiKey,
            OPTIMIZE_FOR: 'speed',
          },
          debug: false,
        });
        await client.connect();
      });

      afterAll(async () => {
        if (client) await client.disconnect();
      });

      it('should authenticate and scrape successfully with BrightData', async () => {
        const result = await client.callTool('scrape', {
          url: 'https://example.com',
          timeout: 30000,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);

        const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);

        console.log('BrightData authentication successful');
      }, 60000);
    });
  });

  describe('Extract Service Authentication', () => {
    describe('Anthropic Authentication', () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('Anthropic auth test requires ANTHROPIC_API_KEY environment variable');
        }

        console.log('\nTesting Anthropic Authentication');
        console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

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

      it('should verify Anthropic authentication via extraction', async () => {
        const result = await client.callTool('scrape', {
          url: 'https://example.com',
          extract: 'Extract the word "Example"',
          timeout: 30000,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toBeDefined();

        const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
        expect(text).toBeDefined();

        console.log('Anthropic authentication successful');
        console.log(`Response preview: ${text?.substring(0, 50)}...`);
      }, 60000);
    });

    describe('OpenAI Authentication', () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI auth test requires OPENAI_API_KEY environment variable');
        }

        console.log('\nTesting OpenAI Authentication');
        console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

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

      it('should verify OpenAI authentication via extraction', async () => {
        const result = await client.callTool('scrape', {
          url: 'https://example.com',
          extract: 'Extract the word "Example"',
          timeout: 30000,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toBeDefined();

        const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
        expect(text).toBeDefined();

        console.log('OpenAI authentication successful');
        console.log(`Response preview: ${text?.substring(0, 50)}...`);
      }, 60000);
    });

    describe('OpenAI-Compatible Authentication', () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
        const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
        const model = process.env.OPENAI_COMPATIBLE_MODEL;

        if (!apiKey || !baseUrl) {
          throw new Error(
            'OpenAI-compatible auth test requires OPENAI_COMPATIBLE_API_KEY and OPENAI_COMPATIBLE_BASE_URL environment variables'
          );
        }

        console.log('\nTesting OpenAI-Compatible Service Authentication');
        console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
        console.log(`Base URL: ${baseUrl}`);
        console.log(`Model: ${model || 'default'}`);

        const env: Record<string, string> = {
          OPENAI_COMPATIBLE_API_KEY: apiKey,
          OPENAI_COMPATIBLE_BASE_URL: baseUrl,
          SKIP_HEALTH_CHECKS: 'true',
        };
        if (model) {
          env.OPENAI_COMPATIBLE_MODEL = model;
        }

        const serverPath = path.join(__dirname, '../../../local/build/index.js');
        client = new TestMCPClient({
          serverPath,
          env,
          debug: false,
        });
        await client.connect();
      });

      afterAll(async () => {
        if (client) await client.disconnect();
      });

      it('should verify OpenAI-compatible service authentication via extraction', async () => {
        const result = await client.callTool('scrape', {
          url: 'https://example.com',
          extract: 'Extract the word "Example"',
          timeout: 30000,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toBeDefined();

        const text = getContentText(result.content[0] as Parameters<typeof getContentText>[0]);
        expect(text).toBeDefined();

        console.log('OpenAI-compatible service authentication successful');
        console.log(`Response preview: ${text?.substring(0, 50)}...`);
      }, 60000);
    });
  });

  describe('Summary', () => {
    it('should provide a summary of configured services', () => {
      console.log('\nAuthentication Health Check Summary');
      console.log('============================================================');

      console.log('\nScraping Services:');
      const scrapingServices = [
        { name: 'Firecrawl', envVar: 'FIRECRAWL_API_KEY' },
        { name: 'BrightData', envVar: 'BRIGHTDATA_API_KEY' },
      ];
      for (const service of scrapingServices) {
        const isConfigured = !!process.env[service.envVar];
        console.log(`  - ${service.name}: ${isConfigured ? 'Configured' : 'Not configured'}`);
      }

      console.log('\nExtract Services:');
      const extractServices = [
        { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
        { name: 'OpenAI', envVar: 'OPENAI_API_KEY' },
        { name: 'OpenAI-Compatible', envVar: 'OPENAI_COMPATIBLE_API_KEY' },
      ];
      for (const service of extractServices) {
        const isConfigured = !!process.env[service.envVar];
        console.log(`  - ${service.name}: ${isConfigured ? 'Configured' : 'Not configured'}`);
      }

      console.log('\nTo configure services, set the following environment variables:');
      console.log('  - Scraping: FIRECRAWL_API_KEY, BRIGHTDATA_API_KEY');
      console.log('  - Extract: ANTHROPIC_API_KEY, OPENAI_API_KEY');
      console.log('  - OpenAI-Compatible: OPENAI_COMPATIBLE_API_KEY + OPENAI_COMPATIBLE_BASE_URL');
    });
  });
});
