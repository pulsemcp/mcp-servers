/**
 * Pages test suite - Tests multiple pages across different environment configurations
 *
 * This test suite validates that various web pages can be scraped correctly
 * under different environment variable configurations.
 *
 * Usage:
 * cd productionized/pulse-fetch && node --import tsx tests/manual/pages/pages.manual.test.ts [--continue-on-failure]
 */

import 'dotenv/config';
import {
  TEST_PAGES,
  ENV_CONFIGS,
  getExpectedOutcome,
  getExpectedStrategy,
  type PageTestCase,
  type EnvVarConfig,
} from './test-config.js';
import { scrapeTool } from '../../../shared/src/tools/scrape.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type {
  ClientFactory,
  StrategyConfigFactory,
  IScrapingClients,
} from '../../../shared/src/server.js';
import { NativeFetcher, FirecrawlClient, BrightDataClient } from '../../../shared/src/server.js';

interface TestResult {
  page: PageTestCase;
  config: EnvVarConfig;
  expected: 'pass' | 'fail';
  actual: 'pass' | 'fail';
  actualStrategy?: 'native' | 'firecrawl' | 'brightdata' | 'none';
  strategiesAttempted?: string[];
  details?: string;
  duration: number;
}

// Parse command line arguments
const args = process.argv.slice(2);
const continueOnFailure = args.includes('--continue-on-failure');

async function testPageWithConfig(page: PageTestCase, config: EnvVarConfig): Promise<TestResult> {
  const startTime = Date.now();

  // Save original env vars
  const originalEnv = {
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
    OPTIMIZE_FOR: process.env.OPTIMIZE_FOR,
  };

  try {
    // Apply config environment variables
    // Note: config here has already been resolved, so 'from_env' has been replaced with actual values
    if (config.FIRECRAWL_API_KEY) {
      process.env.FIRECRAWL_API_KEY = config.FIRECRAWL_API_KEY;
      // FIRECRAWL_API_KEY is set for this config
    } else {
      delete process.env.FIRECRAWL_API_KEY;
      // FIRECRAWL_API_KEY is not set for this config
    }

    if (config.BRIGHTDATA_API_KEY) {
      process.env.BRIGHTDATA_API_KEY = config.BRIGHTDATA_API_KEY;
      // BRIGHTDATA_API_KEY is set for this config
    } else {
      delete process.env.BRIGHTDATA_API_KEY;
      // BRIGHTDATA_API_KEY is not set for this config
    }

    if (config.OPTIMIZE_FOR) {
      process.env.OPTIMIZE_FOR = config.OPTIMIZE_FOR;
    } else {
      delete process.env.OPTIMIZE_FOR;
    }

    // Create a mock server
    const server = new Server({
      name: 'test-server',
      version: '1.0.0',
    });

    // Create the client factory based on current env vars
    const clientFactory: ClientFactory = () => {
      const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
      const brightDataToken = process.env.BRIGHTDATA_API_KEY;

      // Create clients based on available API keys

      const clients: IScrapingClients = {
        native: new NativeFetcher(),
      };

      if (firecrawlApiKey) {
        clients.firecrawl = new FirecrawlClient(firecrawlApiKey);
      }

      if (brightDataToken) {
        clients.brightData = new BrightDataClient(brightDataToken);
      }

      return clients;
    };

    // Create strategy config factory that returns a mock client (no persistence)
    const strategyConfigFactory: StrategyConfigFactory = () => ({
      getStrategyForUrl: async () => null, // Always return null (no stored strategy)
      upsertEntry: async () => {}, // No-op
      getAllEntries: async () => [], // Empty array
      deleteEntry: async () => false, // No-op
    });

    // Get the scrape tool
    const tool = scrapeTool(server, clientFactory, strategyConfigFactory);

    // Call the tool directly
    try {
      const result = await tool.handler({
        url: page.url,
        resultHandling: 'returnOnly', // Don't save test results, just return content
        timeout: 10000, // Short timeout for tests
        forceRescrape: true, // Force fresh scrape to test strategies
      });

      const duration = Date.now() - startTime;
      const expected = getExpectedOutcome(page, config);
      const actual = 'isError' in result && result.isError ? 'fail' : 'pass';

      // Extract strategy information from the result text
      let actualStrategy: 'native' | 'firecrawl' | 'brightdata' | 'none' = 'none';
      let strategiesAttempted: string[] = [];

      if (!('isError' in result) || !result.isError) {
        // Success case - extract strategy from result text
        const resultText = result.content?.[0]?.text || '';
        const strategyMatch = resultText.match(/Scraped using: (\w+)/);
        if (strategyMatch) {
          actualStrategy = strategyMatch[1] as 'native' | 'firecrawl' | 'brightdata';
        }
      } else {
        // Error case - extract diagnostics from error text
        const errorText = result.content?.[0]?.text || '';
        const strategiesMatch = errorText.match(/Strategies attempted: ([^\n]+)/);
        if (strategiesMatch) {
          strategiesAttempted = strategiesMatch[1].split(', ').map((s) => s.trim());
        }
      }

      return {
        page,
        config,
        expected,
        actual,
        actualStrategy: actual === 'pass' ? actualStrategy : 'none',
        strategiesAttempted: strategiesAttempted.length > 0 ? strategiesAttempted : undefined,
        details:
          'isError' in result && result.isError
            ? result.content?.[0]?.text || 'Unknown error'
            : 'Success',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const expected = getExpectedOutcome(page, config);

      return {
        page,
        config,
        expected,
        actual: 'fail',
        actualStrategy: 'none',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  } finally {
    // Restore original env vars
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
  }
}

async function runPagesTestSuite() {
  console.log('🌐 Starting Pages Test Suite');
  console.log('='.repeat(80));
  console.log(`Testing ${TEST_PAGES.length} pages across ${ENV_CONFIGS.length} configurations`);
  console.log(`Mode: ${continueOnFailure ? 'Continue on failure' : 'Fail fast'}`);
  // Environment variables loaded from .env file
  console.log('='.repeat(80));

  // Store actual env values
  const actualEnvValues = {
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
  };

  // Update configs with actual values
  const resolvedConfigs = ENV_CONFIGS.map((config) => {
    const resolved = {
      ...config,
      FIRECRAWL_API_KEY:
        config.FIRECRAWL_API_KEY === 'from_env'
          ? actualEnvValues.FIRECRAWL_API_KEY
          : config.FIRECRAWL_API_KEY,
      BRIGHTDATA_API_KEY:
        config.BRIGHTDATA_API_KEY === 'from_env'
          ? actualEnvValues.BRIGHTDATA_API_KEY
          : config.BRIGHTDATA_API_KEY,
    };
    // Config resolved with appropriate API keys
    return resolved;
  });

  const results: TestResult[] = [];
  const totalTests = TEST_PAGES.length * resolvedConfigs.length;
  let testNumber = 0;

  for (const config of resolvedConfigs) {
    console.log(`\n\n📦 Configuration: ${config.name}`);
    console.log(`📝 ${config.description}`);
    console.log('─'.repeat(60));

    for (const page of TEST_PAGES) {
      testNumber++;
      console.log(`\n[${testNumber}/${totalTests}] Testing: ${page.description} (${page.url})`);

      const result = await testPageWithConfig(page, config);
      results.push(result);

      const statusIcon = result.actual === result.expected ? '✅' : '❌';
      const statusText = result.actual === result.expected ? 'PASS' : 'FAIL';

      console.log(
        `${statusIcon} Result: ${statusText} (Expected: ${result.expected}, Actual: ${result.actual})`
      );

      // Check strategy expectations if available
      const expectedStrategy = getExpectedStrategy(page, config);
      if (result.actual === 'pass' && expectedStrategy) {
        const strategyMatch = result.actualStrategy === expectedStrategy;
        const strategyIcon = strategyMatch ? '✅' : '⚠️';
        console.log(
          `${strategyIcon} Strategy: ${result.actualStrategy} (Expected: ${expectedStrategy})`
        );
      } else if (result.actual === 'pass') {
        console.log(`🔧 Strategy: ${result.actualStrategy}`);
      }

      if (result.strategiesAttempted && result.strategiesAttempted.length > 0) {
        console.log(`🔄 Strategies attempted: ${result.strategiesAttempted.join(' → ')}`);
      }

      console.log(`⏱️  Duration: ${result.duration}ms`);
      if (
        result.details &&
        result.details !== 'Success' &&
        !result.details.includes('Diagnostics:')
      ) {
        console.log(`📝 Details: ${result.details.split('\n')[0]}`); // Show first line only
      }

      // Check for failure or strategy mismatch
      const expectedStrat = getExpectedStrategy(page, config);
      const strategyMismatch =
        expectedStrat && result.actual === 'pass' && result.actualStrategy !== expectedStrat;

      if ((result.actual !== result.expected || strategyMismatch) && !continueOnFailure) {
        console.error('\n❌ Test failed! Stopping execution.');
        console.error(`Page: ${page.url}`);
        console.error(`Config: ${config.name}`);
        if (result.actual !== result.expected) {
          console.error(`Expected result: ${result.expected}, Actual: ${result.actual}`);
        }
        if (strategyMismatch) {
          console.error(`Expected strategy: ${expectedStrat}, Actual: ${result.actualStrategy}`);
        }
        break;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Break outer loop if failed
    if (results.some((r) => r.actual !== r.expected) && !continueOnFailure) {
      break;
    }
  }

  // Summary Report
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 PAGES TEST SUITE SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter((r) => r.actual === r.expected).length;
  const failedTests = results.filter((r) => r.actual !== r.expected).length;

  // Count strategy mismatches
  const strategyMismatches = results.filter((r) => {
    const expectedStrat = getExpectedStrategy(r.page, r.config);
    return expectedStrat && r.actual === 'pass' && r.actualStrategy !== expectedStrat;
  }).length;

  const successRate = Math.round((passedTests / results.length) * 100);

  console.log(`\n📈 Overall Results:`);
  console.log(`  Total tests run: ${results.length}/${totalTests}`);
  console.log(`  Passed: ${passedTests} (${successRate}%)`);
  console.log(`  Failed: ${failedTests}`);
  if (strategyMismatches > 0) {
    console.log(`  ⚠️  Strategy mismatches: ${strategyMismatches}`);
  }

  // Group results by configuration
  console.log(`\n📦 Results by Configuration:`);
  for (const config of resolvedConfigs) {
    const configResults = results.filter((r) => r.config.name === config.name);
    const configPassed = configResults.filter((r) => r.actual === r.expected).length;
    const configTotal = configResults.length;
    console.log(`  ${config.name}: ${configPassed}/${configTotal} passed`);
  }

  // Group results by page
  console.log(`\n🌐 Results by Page:`);
  for (const page of TEST_PAGES) {
    const pageResults = results.filter((r) => r.page.url === page.url);
    const pagePassed = pageResults.filter((r) => r.actual === r.expected).length;
    const pageTotal = pageResults.length;
    console.log(`  ${page.description}: ${pagePassed}/${pageTotal} passed`);
  }

  // Show failed tests and strategy mismatches
  const failedOrMismatchedTests = results.filter((r) => {
    const expectedStrat = getExpectedStrategy(r.page, r.config);
    const strategyMismatch =
      expectedStrat && r.actual === 'pass' && r.actualStrategy !== expectedStrat;
    return r.actual !== r.expected || strategyMismatch;
  });

  if (failedOrMismatchedTests.length > 0) {
    console.log(`\n❌ Failed Tests & Strategy Mismatches:`);
    failedOrMismatchedTests.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.page.description} with ${result.config.name}`);

      if (result.actual !== result.expected) {
        console.log(`     Expected result: ${result.expected}, Actual: ${result.actual}`);
      }

      const expectedStrat = getExpectedStrategy(result.page, result.config);
      if (expectedStrat && result.actual === 'pass' && result.actualStrategy !== expectedStrat) {
        console.log(
          `     ⚠️  Strategy mismatch - Expected: ${expectedStrat}, Actual: ${result.actualStrategy}`
        );
      }

      if (result.strategiesAttempted && result.strategiesAttempted.length > 0) {
        console.log(`     Strategies tried: ${result.strategiesAttempted.join(' → ')}`);
      }

      if (
        result.details &&
        result.details !== 'Success' &&
        !result.details.includes('Diagnostics:')
      ) {
        console.log(`     Details: ${result.details.split('\n')[0]}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  if (failedTests === 0 && strategyMismatches === 0) {
    console.log('✅ All tests passed with expected strategies!');
  } else if (failedTests === 0 && strategyMismatches > 0) {
    console.log(`⚠️  All tests passed but ${strategyMismatches} had unexpected strategies`);
  } else {
    console.log(`⚠️  ${failedTests} test(s) failed`);
  }
  console.log('='.repeat(80));

  process.exit(failedTests > 0 || strategyMismatches > 0 ? 1 : 0);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    'Usage: cd productionized/pulse-fetch && node --import tsx tests/manual/pages/pages.manual.test.ts [--continue-on-failure]'
  );
  runPagesTestSuite().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runPagesTestSuite };
