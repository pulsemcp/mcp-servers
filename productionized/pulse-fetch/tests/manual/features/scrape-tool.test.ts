import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Scrape Tool via MCP', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const env: Record<string, string> = {
      SKIP_HEALTH_CHECKS: 'true',
    };

    // Pass through available API keys for full strategy testing
    if (process.env.FIRECRAWL_API_KEY) {
      env.FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    }
    if (process.env.BRIGHTDATA_API_KEY) {
      env.BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
    }
    if (process.env.OPTIMIZE_FOR) {
      env.OPTIMIZE_FOR = process.env.OPTIMIZE_FOR;
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

  it('should scrape a simple page with automatic strategy selection', async () => {
    const result = await client.callTool('scrape', {
      url: 'https://example.com',
      timeout: 10000,
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Example Domain');

    console.log('Scrape tool successful');
    console.log(`Content length: ${text?.length || 0} characters`);
  });

  it('should handle errors gracefully', async () => {
    const result = await client.callTool('scrape', {
      url: 'https://httpstat.us/500',
      timeout: 10000,
      forceRescrape: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toBeDefined();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Failed to scrape');

    console.log('Error handling working correctly');
  }, 60000);

  it('should support content extraction when LLM is configured', async () => {
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    const hasCompatibleKey = !!process.env.OPENAI_COMPATIBLE_API_KEY;

    if (!hasAnthropicKey && !hasOpenAIKey && !hasCompatibleKey) {
      console.log('Skipping extraction test - no LLM API keys configured');
      return;
    }

    // Create a new client with LLM keys for extraction
    const extractEnv: Record<string, string> = {
      SKIP_HEALTH_CHECKS: 'true',
    };
    if (process.env.ANTHROPIC_API_KEY) {
      extractEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    }
    if (process.env.OPENAI_API_KEY) {
      extractEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    }
    if (process.env.OPENAI_COMPATIBLE_API_KEY) {
      extractEnv.OPENAI_COMPATIBLE_API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY;
    }
    if (process.env.OPENAI_COMPATIBLE_BASE_URL) {
      extractEnv.OPENAI_COMPATIBLE_BASE_URL = process.env.OPENAI_COMPATIBLE_BASE_URL;
    }
    if (process.env.OPENAI_COMPATIBLE_MODEL) {
      extractEnv.OPENAI_COMPATIBLE_MODEL = process.env.OPENAI_COMPATIBLE_MODEL;
    }

    const serverPath = path.join(__dirname, '../../../local/build/index.js');
    const extractClient = new TestMCPClient({
      serverPath,
      env: extractEnv,
      debug: false,
    });
    await extractClient.connect();

    try {
      const result = await extractClient.callTool('scrape', {
        url: 'https://example.com',
        extract: 'What is the main heading on this page?',
        timeout: 30000,
        forceRescrape: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();

      console.log('Extraction successful');
      console.log('Response:', text?.slice(0, 200) + '...');
    } finally {
      await extractClient.disconnect();
    }
  }, 60000);
});
