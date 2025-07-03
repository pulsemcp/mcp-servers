import https from 'https';

interface HealthCheckResult {
  service: string;
  success: boolean;
  error?: string;
}

/**
 * Performs a minimal health check for Firecrawl API
 * Tests authentication without consuming credits
 */
async function checkFirecrawlAuth(apiKey: string): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.firecrawl.dev',
      path: '/v1/scrape',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      // We expect 400 for missing URL parameter, but 401 indicates auth failure
      if (res.statusCode === 401) {
        resolve({
          service: 'Firecrawl',
          success: false,
          error: 'Invalid API key - authentication failed',
        });
      } else if (res.statusCode === 400) {
        // 400 means auth passed but request was invalid (expected without URL)
        resolve({
          service: 'Firecrawl',
          success: true,
        });
      } else {
        resolve({
          service: 'Firecrawl',
          success: false,
          error: `Unexpected response: ${res.statusCode}`,
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        service: 'Firecrawl',
        success: false,
        error: `Connection error: ${error.message}`,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: 'Firecrawl',
        success: false,
        error: 'Request timeout',
      });
    });

    req.setTimeout(5000);
    req.write(JSON.stringify({})); // Empty body to trigger 400 instead of consuming credits
    req.end();
  });
}

/**
 * Performs a minimal health check for BrightData API
 * Tests authentication without consuming credits
 */
async function checkBrightDataAuth(apiKey: string): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brightdata.com',
      path: '/request',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      // We expect 400 for missing zone parameter, but 401 indicates auth failure
      if (res.statusCode === 401) {
        resolve({
          service: 'BrightData',
          success: false,
          error: 'Invalid API key - authentication failed',
        });
      } else if (res.statusCode === 400) {
        // 400 means auth passed but request was invalid (expected without zone/url)
        resolve({
          service: 'BrightData',
          success: true,
        });
      } else {
        resolve({
          service: 'BrightData',
          success: false,
          error: `Unexpected response: ${res.statusCode}`,
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        service: 'BrightData',
        success: false,
        error: `Connection error: ${error.message}`,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: 'BrightData',
        success: false,
        error: 'Request timeout',
      });
    });

    req.setTimeout(5000);
    req.write(JSON.stringify({})); // Empty body to trigger 400 instead of consuming credits
    req.end();
  });
}

/**
 * Run health checks for all configured services
 */
export async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const checks: Promise<HealthCheckResult>[] = [];

  if (process.env.FIRECRAWL_API_KEY) {
    checks.push(checkFirecrawlAuth(process.env.FIRECRAWL_API_KEY));
  }

  if (process.env.BRIGHTDATA_API_KEY) {
    checks.push(checkBrightDataAuth(process.env.BRIGHTDATA_API_KEY));
  }

  if (checks.length === 0) {
    return [];
  }

  return Promise.all(checks);
}
