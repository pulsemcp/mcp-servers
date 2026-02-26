import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runHealthChecks } from '../../shared/src/healthcheck.js';

// Mock the https module to avoid real network calls
vi.mock('https', () => ({
  default: {
    request: vi.fn(),
  },
}));

describe('Health Check Environment Variable Handling', () => {
  const originalFirecrawlKey = process.env.FIRECRAWL_API_KEY;
  const originalBrightDataKey = process.env.BRIGHTDATA_API_KEY;

  beforeEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.BRIGHTDATA_API_KEY;
  });

  afterEach(() => {
    // Restore original env vars
    if (originalFirecrawlKey !== undefined) {
      process.env.FIRECRAWL_API_KEY = originalFirecrawlKey;
    } else {
      delete process.env.FIRECRAWL_API_KEY;
    }
    if (originalBrightDataKey !== undefined) {
      process.env.BRIGHTDATA_API_KEY = originalBrightDataKey;
    } else {
      delete process.env.BRIGHTDATA_API_KEY;
    }
  });

  it('should skip health checks when env vars are undefined', async () => {
    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should skip health checks when env vars are empty strings', async () => {
    process.env.FIRECRAWL_API_KEY = '';
    process.env.BRIGHTDATA_API_KEY = '';

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should skip health checks when env vars are whitespace-only', async () => {
    process.env.FIRECRAWL_API_KEY = '   ';
    process.env.BRIGHTDATA_API_KEY = '  \t  ';

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should skip Firecrawl health check when only FIRECRAWL_API_KEY is blank', async () => {
    process.env.FIRECRAWL_API_KEY = '';
    // BRIGHTDATA_API_KEY is undefined (deleted in beforeEach)

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should skip BrightData health check when only BRIGHTDATA_API_KEY is blank', async () => {
    // FIRECRAWL_API_KEY is undefined (deleted in beforeEach)
    process.env.BRIGHTDATA_API_KEY = '';

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });
});
