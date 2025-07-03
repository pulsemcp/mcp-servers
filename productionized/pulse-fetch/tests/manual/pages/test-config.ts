/**
 * Configuration for pages test suite
 *
 * This file defines the pages to test, environment variable configurations,
 * and expected outcomes for each combination.
 */

export interface PageTestCase {
  url: string;
  description: string;
  expectedResults: {
    [configName: string]: 'pass' | 'fail';
  };
}

export interface EnvVarConfig {
  name: string;
  FIRECRAWL_API_KEY?: string;
  BRIGHTDATA_BEARER_TOKEN?: string;
  OPTIMIZE_FOR?: 'cost' | 'speed';
  description: string;
}

// Test configuration with expected results per environment
export const TEST_PAGES: PageTestCase[] = [
  {
    url: 'https://github.com',
    description: 'GitHub homepage (may have anti-bot protection)',
    expectedResults: {
      'Native Only': 'pass', // GitHub usually works with native
      'Firecrawl Only': 'pass',
      'BrightData Only': 'pass',
      'All Services (Cost Optimized)': 'pass',
      'All Services (Speed Optimized)': 'pass',
    },
  },
  {
    url: 'https://example.com',
    description: 'Simple HTML example page',
    expectedResults: {
      'Native Only': 'pass', // Simple page works everywhere
      'Firecrawl Only': 'pass',
      'BrightData Only': 'pass',
      'All Services (Cost Optimized)': 'pass',
      'All Services (Speed Optimized)': 'pass',
    },
  },
  {
    url: 'https://httpstat.us/403',
    description: 'HTTP 403 error page',
    expectedResults: {
      'Native Only': 'fail', // 403 should fail everywhere
      'Firecrawl Only': 'fail',
      'BrightData Only': 'fail',
      'All Services (Cost Optimized)': 'fail',
      'All Services (Speed Optimized)': 'fail',
    },
  },
  {
    url: 'https://httpstat.us/500',
    description: 'HTTP 500 error page',
    expectedResults: {
      'Native Only': 'fail', // 500 should fail everywhere
      'Firecrawl Only': 'fail',
      'BrightData Only': 'fail',
      'All Services (Cost Optimized)': 'fail',
      'All Services (Speed Optimized)': 'fail',
    },
  },
];

// Environment variable configurations to test
export const ENV_CONFIGS: EnvVarConfig[] = [
  {
    name: 'Native Only',
    description: 'Only native scraping available',
    // No API keys set
  },
  {
    name: 'Firecrawl Only',
    description: 'Only Firecrawl API available',
    FIRECRAWL_API_KEY: 'from_env', // Will be replaced with actual env var
    OPTIMIZE_FOR: 'speed',
  },
  {
    name: 'BrightData Only',
    description: 'Only BrightData API available',
    BRIGHTDATA_BEARER_TOKEN: 'from_env',
    OPTIMIZE_FOR: 'speed',
  },
  {
    name: 'All Services (Cost Optimized)',
    description: 'All scraping services available, optimized for cost',
    FIRECRAWL_API_KEY: 'from_env',
    BRIGHTDATA_BEARER_TOKEN: 'from_env',
    OPTIMIZE_FOR: 'cost',
  },
  {
    name: 'All Services (Speed Optimized)',
    description: 'All scraping services available, optimized for speed',
    FIRECRAWL_API_KEY: 'from_env',
    BRIGHTDATA_BEARER_TOKEN: 'from_env',
    OPTIMIZE_FOR: 'speed',
  },
];

// Function to get actual environment variable value
export function resolveEnvValue(value: string | undefined): string | undefined {
  if (value === 'from_env') {
    // This will be replaced in the test runner with actual values
    return undefined;
  }
  return value;
}

// Function to determine expected outcome based on config and page
export function getExpectedOutcome(page: PageTestCase, config: EnvVarConfig): 'pass' | 'fail' {
  return page.expectedResults[config.name] || 'pass'; // Default to pass if not specified
}
