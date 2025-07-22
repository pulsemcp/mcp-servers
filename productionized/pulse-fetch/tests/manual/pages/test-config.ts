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
  expectedStrategies?: {
    [configName: string]: 'native' | 'firecrawl' | 'brightdata' | 'none';
  };
}

export interface EnvVarConfig {
  name: string;
  FIRECRAWL_API_KEY?: string;
  BRIGHTDATA_API_KEY?: string;
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
    expectedStrategies: {
      'Native Only': 'native',
      'Firecrawl Only': 'firecrawl',
      'BrightData Only': 'brightdata',
      'All Services (Cost Optimized)': 'native', // Cost optimized tries native first
      'All Services (Speed Optimized)': 'firecrawl', // Speed optimized skips native
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
    expectedStrategies: {
      'Native Only': 'native',
      'Firecrawl Only': 'firecrawl',
      'BrightData Only': 'brightdata',
      'All Services (Cost Optimized)': 'native', // Simple page should work with native
      'All Services (Speed Optimized)': 'firecrawl', // Speed mode starts with firecrawl
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
    expectedStrategies: {
      'Native Only': 'none',
      'Firecrawl Only': 'none',
      'BrightData Only': 'none',
      'All Services (Cost Optimized)': 'none',
      'All Services (Speed Optimized)': 'none',
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
    expectedStrategies: {
      'Native Only': 'none',
      'Firecrawl Only': 'none',
      'BrightData Only': 'none',
      'All Services (Cost Optimized)': 'none',
      'All Services (Speed Optimized)': 'none',
    },
  },
  {
    url: 'https://arxiv.org/pdf/2104.02821',
    description: 'ArXiv PDF - Binary content properly parsed with native strategy',
    expectedResults: {
      'Native Only': 'pass', // Native now handles PDFs correctly
      'Firecrawl Only': 'pass', // Firecrawl might handle PDFs
      'BrightData Only': 'pass', // BrightData might handle PDFs
      'All Services (Cost Optimized)': 'pass', // Native should succeed
      'All Services (Speed Optimized)': 'pass', // Should use Firecrawl
    },
    expectedStrategies: {
      'Native Only': 'native', // Native can now parse PDFs
      'Firecrawl Only': 'firecrawl',
      'BrightData Only': 'brightdata',
      'All Services (Cost Optimized)': 'native', // Native should succeed on first try
      'All Services (Speed Optimized)': 'firecrawl',
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
    BRIGHTDATA_API_KEY: 'from_env',
    OPTIMIZE_FOR: 'speed',
  },
  {
    name: 'All Services (Cost Optimized)',
    description: 'All scraping services available, optimized for cost',
    FIRECRAWL_API_KEY: 'from_env',
    BRIGHTDATA_API_KEY: 'from_env',
    OPTIMIZE_FOR: 'cost',
  },
  {
    name: 'All Services (Speed Optimized)',
    description: 'All scraping services available, optimized for speed',
    FIRECRAWL_API_KEY: 'from_env',
    BRIGHTDATA_API_KEY: 'from_env',
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

// Function to determine expected strategy based on config and page
export function getExpectedStrategy(
  page: PageTestCase,
  config: EnvVarConfig
): 'native' | 'firecrawl' | 'brightdata' | 'none' | undefined {
  return page.expectedStrategies?.[config.name];
}
