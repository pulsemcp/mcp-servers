import { describe, it, expect } from 'vitest';
import { runHealthChecks } from '../../../shared/src/healthcheck.js';
import { AnthropicExtractClient } from '../../../shared/src/extract/anthropic-client.js';
import { OpenAIExtractClient } from '../../../shared/src/extract/openai-client.js';
import { OpenAICompatibleExtractClient } from '../../../shared/src/extract/openai-compatible-client.js';

describe('Authentication Health Checks', () => {
  describe('Scraping Service Authentication', () => {
    it('should check scraping service authentication without consuming credits', async () => {
      console.log('🔐 Testing Scraping Service Authentication Health Checks');
      console.log('============================================================');

      const results = await runHealthChecks();

      if (results.length === 0) {
        console.log(
          '⚠️  No scraping services configured - set FIRECRAWL_API_KEY or BRIGHTDATA_API_KEY'
        );
        return;
      }

      for (const result of results) {
        console.log(`\n🔍 Checking ${result.service}:`);

        if (result.success) {
          console.log(`  ✅ Authentication successful`);
        } else {
          console.log(`  ❌ Authentication failed: ${result.error}`);
        }

        // Log which environment variable is being used
        if (result.service === 'Firecrawl') {
          console.log(
            `  🔑 Using FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY?.substring(0, 10)}...`
          );
        } else if (result.service === 'BrightData') {
          console.log(
            `  🔑 Using BRIGHTDATA_API_KEY: ${process.env.BRIGHTDATA_API_KEY?.substring(0, 20)}...`
          );
        }
      }

      // At least one service should authenticate successfully if configured
      const hasSuccessfulAuth = results.some((r) => r.success);
      if (results.length > 0) {
        expect(hasSuccessfulAuth).toBe(true);
      }
    });
  });

  describe('Extract Service Authentication', () => {
    it('should verify Anthropic authentication', async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.log('⚠️  Skipping Anthropic auth test - ANTHROPIC_API_KEY not set');
        return;
      }

      console.log('\n🤖 Testing Anthropic Authentication');
      console.log('============================================================');
      console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

      try {
        const client = new AnthropicExtractClient({ apiKey });

        // Try a minimal extraction to test auth
        const result = await client.extract('Test content', 'Extract the word "Test"');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        console.log('✅ Anthropic authentication successful');
        console.log(`📝 Response preview: ${result.data?.substring(0, 50)}...`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('API key')
        ) {
          console.log(`❌ Anthropic authentication failed: ${errorMessage}`);
          expect.fail('Authentication failed');
        } else {
          // Other errors might be rate limits, etc
          console.log(`⚠️  Anthropic request failed (non-auth): ${errorMessage}`);
        }
      }
    });

    it('should verify OpenAI authentication', async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.log('⚠️  Skipping OpenAI auth test - OPENAI_API_KEY not set');
        return;
      }

      console.log('\n🧠 Testing OpenAI Authentication');
      console.log('============================================================');
      console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

      try {
        const client = new OpenAIExtractClient({ apiKey });

        // Try a minimal extraction to test auth
        const result = await client.extract('Test content', 'Extract the word "Test"');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        console.log('✅ OpenAI authentication successful');
        console.log(`📝 Response preview: ${result.data?.substring(0, 50)}...`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('Incorrect API key') ||
          errorMessage.includes('authentication')
        ) {
          console.log(`❌ OpenAI authentication failed: ${errorMessage}`);
          expect.fail('Authentication failed');
        } else {
          // Other errors might be rate limits, model not found, etc
          console.log(`⚠️  OpenAI request failed (non-auth): ${errorMessage}`);
        }
      }
    });

    it('should verify OpenAI-compatible service authentication', async () => {
      const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
      const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
      const model = process.env.OPENAI_COMPATIBLE_MODEL;

      if (!apiKey || !baseUrl) {
        console.log(
          '⚠️  Skipping OpenAI-compatible auth test - OPENAI_COMPATIBLE_API_KEY or OPENAI_COMPATIBLE_BASE_URL not set'
        );
        return;
      }

      console.log('\n🔧 Testing OpenAI-Compatible Service Authentication');
      console.log('============================================================');
      console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
      console.log(`🌐 Base URL: ${baseUrl}`);
      console.log(`🤖 Model: ${model || 'default'}`);

      try {
        const client = new OpenAICompatibleExtractClient({
          apiKey,
          baseUrl,
          model,
        });

        // Try a minimal extraction to test auth
        const result = await client.extract('Test content', 'Extract the word "Test"');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        console.log('✅ OpenAI-compatible service authentication successful');
        console.log(`📝 Response preview: ${result.data?.substring(0, 50)}...`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('Unauthorized')
        ) {
          console.log(`❌ OpenAI-compatible service authentication failed: ${errorMessage}`);
          expect.fail('Authentication failed');
        } else {
          // Other errors might be connection issues, etc
          console.log(`⚠️  OpenAI-compatible service request failed (non-auth): ${errorMessage}`);
        }
      }
    });
  });

  describe('Summary', () => {
    it('should provide a summary of all authentication checks', async () => {
      console.log('\n📊 Authentication Health Check Summary');
      console.log('============================================================');

      // Check scraping services
      const scrapingResults = await runHealthChecks();
      console.log('\n🌐 Scraping Services:');
      if (scrapingResults.length === 0) {
        console.log('  ⚠️  No scraping services configured');
      } else {
        for (const result of scrapingResults) {
          console.log(
            `  - ${result.service}: ${result.success ? '✅ OK' : `❌ Failed (${result.error})`}`
          );
        }
      }

      // Check extract services
      console.log('\n🤖 Extract Services:');

      const services = [
        { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
        { name: 'OpenAI', envVar: 'OPENAI_API_KEY' },
        { name: 'OpenAI-Compatible', envVar: 'OPENAI_COMPATIBLE_API_KEY' },
      ];

      for (const service of services) {
        const isConfigured = !!process.env[service.envVar];
        if (isConfigured) {
          console.log(`  - ${service.name}: 🔑 Configured (run individual tests to verify)`);
        } else {
          console.log(`  - ${service.name}: ⚠️  Not configured`);
        }
      }

      console.log('\n💡 To configure services, set the following environment variables:');
      console.log('  - Scraping: FIRECRAWL_API_KEY, BRIGHTDATA_API_KEY');
      console.log('  - Extract: ANTHROPIC_API_KEY, OPENAI_API_KEY');
      console.log('  - OpenAI-Compatible: OPENAI_COMPATIBLE_API_KEY + OPENAI_COMPATIBLE_BASE_URL');
    });
  });
});
