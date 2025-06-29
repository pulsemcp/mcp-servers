/**
 * Comprehensive manual test suite for all scraping client classes
 *
 * Tests predefined URLs with expected scraping methods:
 * - Native: pulsemcp.com (simple static site)
 * - Firecrawl: espn.com (content-rich site)
 * - BrightData: yelp.com (protected content)
 *
 * One-liner command (run from pulse-fetch directory):
 * node --import tsx tests/manual/comprehensive-suite.manual.test.ts
 */

import 'dotenv/config';
import { testNativeScrapingClient } from './native-scraping.manual.test.js';
import { testFirecrawlScrapingClient } from './firecrawl-scraping.manual.test.js';
import { testBrightDataScrapingClient } from './brightdata-scraping.manual.test.js';

interface TestCase {
  url: string;
  description: string;
  expectedMethods: string[];
  notes?: string;
}

const TEST_CASES: TestCase[] = [
  {
    url: 'https://example.com',
    description: 'Example.com - Basic test page',
    expectedMethods: ['native'],
    notes: 'Simple HTML page for basic functionality testing',
  },
  {
    url: 'https://pulsemcp.com',
    description: 'PulseMCP Homepage - Simple static site',
    expectedMethods: ['native'],
    notes: 'Should work well with native client due to simple structure',
  },
  {
    url: 'https://espn.com',
    description: 'ESPN - Content-rich news site',
    expectedMethods: ['firecrawl'],
    notes: 'Complex site with ads/navigation - Firecrawl should extract main content cleanly',
  },
  {
    url: 'https://news.ycombinator.com',
    description: 'Hacker News - Minimal dynamic content',
    expectedMethods: ['native', 'firecrawl'],
    notes: 'Should work with native, Firecrawl might provide better structure',
  },
  {
    url: 'https://httpstat.us/403',
    description: 'HTTP 403 Status Test - Simulated protected content',
    expectedMethods: ['brightdata'],
    notes: 'Native should fail with 403, Firecrawl may handle as success, BrightData should work',
  },
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureTestOutput(
  testFn: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Capture console output
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };

    await testFn();

    // Restore console.log
    console.log = originalLog;

    // Check if test was successful (look for success indicators)
    // A test is successful if it shows "✅ [Client] scraping successful"
    // even if it also shows ❌ in content analysis or other parts
    const hasSuccess =
      output.includes('✅') &&
      (output.includes('scraping successful') ||
        output.includes('Native scraping successful') ||
        output.includes('Firecrawl scraping successful') ||
        output.includes('BrightData scraping successful'));
    return { success: hasSuccess };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runComprehensiveClientTests() {
  console.log('🚀 Starting Comprehensive Pulse-Fetch Client Test Suite');
  console.log('='.repeat(80));

  const results: Array<{
    testCase: TestCase;
    nativeSuccess: boolean;
    firecrawlSuccess: boolean;
    brightdataSuccess: boolean;
    errors: string[];
  }> = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n📋 Test ${i + 1}/${TEST_CASES.length}: ${testCase.description}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log(`📝 Expected methods: ${testCase.expectedMethods.join(', ')}`);
    if (testCase.notes) {
      console.log(`💡 Notes: ${testCase.notes}`);
    }
    console.log('-'.repeat(60));

    const result = {
      testCase,
      nativeSuccess: false,
      firecrawlSuccess: false,
      brightdataSuccess: false,
      errors: [] as string[],
    };

    // Test Native Scraping Client
    console.log('\n🔍 Testing Native Scraping Client...');
    const nativeResult = await captureTestOutput(() => testNativeScrapingClient(testCase.url));
    result.nativeSuccess = nativeResult.success;
    if (!nativeResult.success && nativeResult.error) {
      result.errors.push(`Native: ${nativeResult.error}`);
    }

    await sleep(2000); // Rate limiting

    // Test Firecrawl Client (if API key available)
    if (process.env.FIRECRAWL_API_KEY) {
      console.log('\n🔥 Testing Firecrawl Scraping Client...');
      const firecrawlResult = await captureTestOutput(() =>
        testFirecrawlScrapingClient(testCase.url)
      );
      result.firecrawlSuccess = firecrawlResult.success;
      if (!firecrawlResult.success && firecrawlResult.error) {
        result.errors.push(`Firecrawl: ${firecrawlResult.error}`);
      }
      await sleep(2000); // Rate limiting
    } else {
      console.log('\n⚠️  Skipping Firecrawl (no API key)');
    }

    // Test BrightData Client (if API key available)
    if (process.env.BRIGHTDATA_API_KEY) {
      console.log('\n🌟 Testing BrightData Scraping Client...');
      const brightdataResult = await captureTestOutput(() =>
        testBrightDataScrapingClient(testCase.url)
      );
      result.brightdataSuccess = brightdataResult.success;
      if (!brightdataResult.success && brightdataResult.error) {
        result.errors.push(`BrightData: ${brightdataResult.error}`);
      }
      await sleep(2000); // Rate limiting
    } else {
      console.log('\n⚠️  Skipping BrightData (no API key)');
    }

    results.push(result);
    console.log('\n' + '='.repeat(80));
  }

  // Summary Report
  console.log('\n📊 CLIENT TEST SUMMARY REPORT');
  console.log('='.repeat(80));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`\n${i + 1}. ${result.testCase.description}`);
    console.log(`   URL: ${result.testCase.url}`);
    console.log(`   Native Client:     ${result.nativeSuccess ? '✅' : '❌'}`);
    console.log(`   Firecrawl Client:  ${result.firecrawlSuccess ? '✅' : '❌'}`);
    console.log(`   BrightData Client: ${result.brightdataSuccess ? '✅' : '❌'}`);

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }

    // Check if expected methods worked
    const expectedWorking = result.testCase.expectedMethods.some((method) => {
      switch (method) {
        case 'native':
          return result.nativeSuccess;
        case 'firecrawl':
          return result.firecrawlSuccess;
        case 'brightdata':
          return result.brightdataSuccess;
        default:
          return false;
      }
    });

    console.log(`   Expected: ${expectedWorking ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Overall statistics
  const totalTests = results.length;
  const nativeSuccesses = results.filter((r) => r.nativeSuccess).length;
  const firecrawlSuccesses = results.filter((r) => r.firecrawlSuccess).length;
  const brightdataSuccesses = results.filter((r) => r.brightdataSuccess).length;
  const expectedPasses = results.filter((r) =>
    r.testCase.expectedMethods.some((method) => {
      switch (method) {
        case 'native':
          return r.nativeSuccess;
        case 'firecrawl':
          return r.firecrawlSuccess;
        case 'brightdata':
          return r.brightdataSuccess;
        default:
          return false;
      }
    })
  ).length;

  console.log('\n📈 OVERALL CLIENT STATISTICS');
  console.log('-'.repeat(40));
  console.log(`Total test cases: ${totalTests}`);
  console.log(
    `Native client success rate: ${nativeSuccesses}/${totalTests} (${Math.round((nativeSuccesses / totalTests) * 100)}%)`
  );
  console.log(
    `Firecrawl client success rate: ${firecrawlSuccesses}/${totalTests} (${Math.round((firecrawlSuccesses / totalTests) * 100)}%)`
  );
  console.log(
    `BrightData client success rate: ${brightdataSuccesses}/${totalTests} (${Math.round((brightdataSuccesses / totalTests) * 100)}%)`
  );
  console.log(
    `Expected methods working: ${expectedPasses}/${totalTests} (${Math.round((expectedPasses / totalTests) * 100)}%)`
  );

  console.log('\n✅ Comprehensive client test suite completed!');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    'Usage: cd productionized/pulse-fetch && node --import tsx tests/manual/comprehensive-suite.manual.test.ts'
  );
  runComprehensiveClientTests().catch(console.error);
}

export { runComprehensiveClientTests, TEST_CASES };
