import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runHealthChecks } from '../../shared/src/healthcheck.js';

// Mock the https module to avoid real network calls
// Return a no-op request object that simulates a pending request
vi.mock('https', () => ({
  default: {
    request: vi.fn((_options, callback) => {
      // Simulate a successful auth check (400 = auth passed, request invalid)
      if (callback) {
        setTimeout(() => callback({ statusCode: 400 }), 0);
      }
      return {
        on: vi.fn(),
        setTimeout: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };
    }),
  },
}));

describe('Health Check Environment Variable Handling', () => {
  const originalFirecrawlKey = process.env.FIRECRAWL_API_KEY;
  const originalBrightDataKey = process.env.BRIGHTDATA_API_KEY;

  beforeEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.BRIGHTDATA_API_KEY;
    vi.clearAllMocks();
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

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should skip BrightData health check when only BRIGHTDATA_API_KEY is blank', async () => {
    process.env.BRIGHTDATA_API_KEY = '';

    const results = await runHealthChecks();
    expect(results).toEqual([]);
  });

  it('should run Firecrawl health check when FIRECRAWL_API_KEY has a real value', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test-key-123';

    const results = await runHealthChecks();
    expect(results).toHaveLength(1);
    expect(results[0].service).toBe('Firecrawl');
    expect(results[0].success).toBe(true);
  });

  it('should run BrightData health check when BRIGHTDATA_API_KEY has a real value', async () => {
    process.env.BRIGHTDATA_API_KEY = 'bd-test-key-456';

    const results = await runHealthChecks();
    expect(results).toHaveLength(1);
    expect(results[0].service).toBe('BrightData');
    expect(results[0].success).toBe(true);
  });

  it('should run both health checks when both keys are set', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test-key-123';
    process.env.BRIGHTDATA_API_KEY = 'bd-test-key-456';

    const results = await runHealthChecks();
    expect(results).toHaveLength(2);
    const services = results.map((r) => r.service).sort();
    expect(services).toEqual(['BrightData', 'Firecrawl']);
  });
});
