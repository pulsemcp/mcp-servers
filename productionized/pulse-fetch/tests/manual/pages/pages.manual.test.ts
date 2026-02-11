/**
 * Pages test suite - Tests multiple pages across different environment configurations
 *
 * This test suite validates that various web pages can be scraped correctly
 * under different environment variable configurations using TestMCPClient.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import {
  TEST_PAGES,
  ENV_CONFIGS,
  getExpectedOutcome,
  getExpectedStrategy,
  type EnvVarConfig,
} from './test-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve 'from_env' values in configs with actual environment variable values.
 */
function resolveConfigs(): EnvVarConfig[] {
  const actualEnvValues = {
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
  };

  return ENV_CONFIGS.map((config) => ({
    ...config,
    FIRECRAWL_API_KEY:
      config.FIRECRAWL_API_KEY === 'from_env'
        ? actualEnvValues.FIRECRAWL_API_KEY
        : config.FIRECRAWL_API_KEY,
    BRIGHTDATA_API_KEY:
      config.BRIGHTDATA_API_KEY === 'from_env'
        ? actualEnvValues.BRIGHTDATA_API_KEY
        : config.BRIGHTDATA_API_KEY,
  }));
}

/**
 * Build environment variables for TestMCPClient from a resolved config.
 */
function buildEnvForConfig(config: EnvVarConfig): Record<string, string> {
  const env: Record<string, string> = {
    SKIP_HEALTH_CHECKS: 'true',
  };

  if (config.FIRECRAWL_API_KEY) {
    env.FIRECRAWL_API_KEY = config.FIRECRAWL_API_KEY;
  }
  if (config.BRIGHTDATA_API_KEY) {
    env.BRIGHTDATA_API_KEY = config.BRIGHTDATA_API_KEY;
  }
  if (config.OPTIMIZE_FOR) {
    env.OPTIMIZE_FOR = config.OPTIMIZE_FOR;
  }

  return env;
}

const resolvedConfigs = resolveConfigs();

describe('Pages Test Suite', () => {
  for (const config of resolvedConfigs) {
    // Skip configs that require API keys we don't have
    const needsFirecrawl = config.FIRECRAWL_API_KEY !== undefined;
    const needsBrightData = config.BRIGHTDATA_API_KEY !== undefined;
    const hasFirecrawl = !!config.FIRECRAWL_API_KEY;
    const hasBrightData = !!config.BRIGHTDATA_API_KEY;

    if ((needsFirecrawl && !hasFirecrawl) || (needsBrightData && !hasBrightData)) {
      describe.skip(`Configuration: ${config.name}`, () => {
        it('skipped - required API keys not available', () => {});
      });
      continue;
    }

    describe(`Configuration: ${config.name}`, () => {
      let client: TestMCPClient;

      beforeAll(async () => {
        console.log(`\nConfiguration: ${config.name}`);
        console.log(`Description: ${config.description}`);
        console.log('------------------------------------------------------------');

        const serverPath = path.join(__dirname, '../../../local/build/index.js');
        const env = buildEnvForConfig(config);

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

      for (const page of TEST_PAGES) {
        const expected = getExpectedOutcome(page, config);
        const expectedStrategy = getExpectedStrategy(page, config);

        it(`should ${expected === 'pass' ? 'successfully scrape' : 'fail to scrape'}: ${page.description} (${page.url})`, async () => {
          console.log(`\nTesting: ${page.description} (${page.url})`);

          const result = await client.callTool('scrape', {
            url: page.url,
            timeout: 10000,
            forceRescrape: true,
          });

          const actual = result.isError ? 'fail' : 'pass';

          if (expected === 'pass') {
            expect(result.isError).toBeFalsy();
            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);

            const text = (result.content[0] as { text: string }).text;
            expect(text).toBeDefined();

            // Check strategy if expected
            if (expectedStrategy && expectedStrategy !== 'none') {
              const strategyMatch = text.match(/Scraped using: (\w+)/);
              if (strategyMatch) {
                const actualStrategy = strategyMatch[1];
                console.log(`Strategy: ${actualStrategy} (Expected: ${expectedStrategy})`);
              } else {
                console.log(`Strategy: unknown (Expected: ${expectedStrategy})`);
              }
            }

            console.log(`Result: PASS (Expected: ${expected})`);
          } else {
            expect(result.isError).toBe(true);

            const text = (result.content[0] as { text: string }).text;

            // Extract diagnostics from error text
            const strategiesMatch = text?.match(/Strategies attempted: ([^\n]+)/);
            if (strategiesMatch) {
              console.log(`Strategies attempted: ${strategiesMatch[1]}`);
            }

            console.log(`Result: FAIL (Expected: ${expected})`);
          }

          // Verify outcome matches expectation
          expect(actual).toBe(expected);
        }, 60000);
      }
    });
  }
});
