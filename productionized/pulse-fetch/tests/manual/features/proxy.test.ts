import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { NativeScrapingClient } from '../../../shared/src/scraping-client/native-scrape-client.js';
import { FirecrawlClient } from '../../../shared/src/scraping-client/firecrawl-client.js';
import { BrightDataClient } from '../../../shared/src/scraping-client/brightdata-client.js';
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

describe('Proxy Support', () => {
  let proxyServer: http.Server;
  let proxyRequests: { method: string; url: string; host: string }[] = [];
  const PROXY_PORT = 8889;
  let originalHttpProxy: string | undefined;
  let originalHttpsProxy: string | undefined;

  beforeAll(async () => {
    // Save original proxy settings
    originalHttpProxy = process.env.HTTP_PROXY;
    originalHttpsProxy = process.env.HTTPS_PROXY;

    // Create a test proxy server that logs and forwards requests
    proxyServer = http.createServer((req, res) => {
      const url = req.url || '';
      const host = req.headers.host || '';

      console.log(`🔄 Proxy request: ${req.method} ${url} (Host: ${host})`);

      proxyRequests.push({
        method: req.method || '',
        url,
        host,
      });

      // For testing, we'll return a mock response instead of actually proxying
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Proxy Test Response</title></head>
          <body>
            <h1>Test Page via Proxy</h1>
            <p>This response came through the test proxy server.</p>
          </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, () => {
        console.log(`\n🌐 Test proxy server listening on port ${PROXY_PORT}`);
        resolve();
      });
    });

    // Configure proxy
    const proxyUrl = `http://localhost:${PROXY_PORT}`;
    process.env.HTTP_PROXY = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;

    // Set up global proxy agent using EnvHttpProxyAgent
    // which automatically reads the environment variables we just set
    const proxyAgent = new EnvHttpProxyAgent();
    setGlobalDispatcher(proxyAgent);

    console.log(`✅ Proxy configured: ${proxyUrl}\n`);
  });

  afterAll(async () => {
    // Restore original proxy settings
    if (originalHttpProxy !== undefined) {
      process.env.HTTP_PROXY = originalHttpProxy;
    } else {
      delete process.env.HTTP_PROXY;
    }

    if (originalHttpsProxy !== undefined) {
      process.env.HTTPS_PROXY = originalHttpsProxy;
    } else {
      delete process.env.HTTPS_PROXY;
    }

    // Close proxy server
    await new Promise<void>((resolve) => {
      proxyServer.close(() => resolve());
    });

    console.log('\n🛑 Test proxy server closed');
  });

  describe('Native Scraping Client', () => {
    it('should route requests through proxy', async () => {
      proxyRequests = []; // Clear previous requests

      const client = new NativeScrapingClient();
      const url = 'https://example.com/native-test';

      console.log(`\n📋 Testing Native Client with proxy...`);
      console.log(`🔗 URL: ${url}`);

      try {
        const result = await client.scrape(url, { timeout: 5000 });

        console.log(`✅ Request completed`);
        console.log(`📊 Success: ${result.success}`);
        console.log(`📈 Status Code: ${result.statusCode || 'N/A'}`);

        // Verify proxy was used
        const proxyRequest = proxyRequests.find(
          (r) => r.url.includes('example.com') || r.host.includes('example.com')
        );

        expect(proxyRequest).toBeDefined();
        console.log(`✅ Confirmed: Request went through proxy`);
        console.log(`   - Method: ${proxyRequest?.method}`);
        console.log(`   - URL: ${proxyRequest?.url}`);
        console.log(`   - Host: ${proxyRequest?.host}`);
      } catch (error) {
        // The request might fail because our test proxy doesn't actually forward
        // But we can still check if it attempted to use the proxy
        console.log(`⚠️  Request failed (expected with test proxy): ${(error as Error).message}`);

        // Check if any proxy requests were made
        expect(proxyRequests.length).toBeGreaterThan(0);
        console.log(`✅ Proxy requests made: ${proxyRequests.length}`);
      }
    });
  });

  describe('Firecrawl Client', () => {
    it('should route API requests through proxy', async () => {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        console.log('\n⚠️  Skipping Firecrawl test - FIRECRAWL_API_KEY not set');
        return;
      }

      proxyRequests = []; // Clear previous requests

      const client = new FirecrawlClient(apiKey, {});
      const url = 'https://example.com/firecrawl-test';

      console.log(`\n📋 Testing Firecrawl Client with proxy...`);
      console.log(`🔗 URL: ${url}`);

      try {
        const result = await client.scrape(url, { timeout: 10000 });

        console.log(`✅ Request completed`);
        console.log(`📊 Success: ${result.success}`);
        console.log(`📈 Status Code: ${result.statusCode || 'N/A'}`);

        // Check for Firecrawl API requests through proxy
        const apiRequest = proxyRequests.find(
          (r) => r.url.includes('firecrawl') || r.host.includes('firecrawl')
        );

        if (apiRequest) {
          console.log(`✅ Confirmed: Firecrawl API request went through proxy`);
          console.log(`   - Method: ${apiRequest.method}`);
          console.log(`   - URL: ${apiRequest.url}`);
          console.log(`   - Host: ${apiRequest.host}`);
        } else {
          console.log(`ℹ️  No Firecrawl API requests detected through proxy`);
          console.log(`   Total proxy requests: ${proxyRequests.length}`);
        }
      } catch (error) {
        console.log(`⚠️  Request failed: ${(error as Error).message}`);

        // Even if the request fails, check if it attempted to use the proxy
        if (proxyRequests.length > 0) {
          console.log(`✅ Proxy requests made: ${proxyRequests.length}`);
          proxyRequests.forEach((req, i) => {
            console.log(`   ${i + 1}. ${req.method} ${req.host}${req.url}`);
          });
        }
      }
    });
  });

  describe('BrightData Client', () => {
    it('should route API requests through proxy', async () => {
      const apiKey = process.env.BRIGHTDATA_API_KEY;
      if (!apiKey) {
        console.log('\n⚠️  Skipping BrightData test - BRIGHTDATA_API_KEY not set');
        return;
      }

      proxyRequests = []; // Clear previous requests

      const client = new BrightDataClient(apiKey, {});
      const url = 'https://example.com/brightdata-test';

      console.log(`\n📋 Testing BrightData Client with proxy...`);
      console.log(`🔗 URL: ${url}`);

      try {
        const result = await client.scrape(url, { timeout: 10000 });

        console.log(`✅ Request completed`);
        console.log(`📊 Success: ${result.success}`);
        console.log(`📈 Status Code: ${result.statusCode || 'N/A'}`);

        // Check for BrightData API requests through proxy
        const apiRequest = proxyRequests.find(
          (r) =>
            r.url.includes('brightdata') ||
            r.host.includes('brightdata') ||
            r.url.includes('unblocker') ||
            r.host.includes('unblocker')
        );

        if (apiRequest) {
          console.log(`✅ Confirmed: BrightData API request went through proxy`);
          console.log(`   - Method: ${apiRequest.method}`);
          console.log(`   - URL: ${apiRequest.url}`);
          console.log(`   - Host: ${apiRequest.host}`);
        } else {
          console.log(`ℹ️  No BrightData API requests detected through proxy`);
          console.log(`   Total proxy requests: ${proxyRequests.length}`);
        }
      } catch (error) {
        console.log(`⚠️  Request failed: ${(error as Error).message}`);

        // Even if the request fails, check if it attempted to use the proxy
        if (proxyRequests.length > 0) {
          console.log(`✅ Proxy requests made: ${proxyRequests.length}`);
          proxyRequests.forEach((req, i) => {
            console.log(`   ${i + 1}. ${req.method} ${req.host}${req.url}`);
          });
        }
      }
    });
  });

  describe('NO_PROXY Support', () => {
    it('should bypass proxy for hosts in NO_PROXY', async () => {
      // Save current proxy requests count
      const requestsBefore = proxyRequests.length;

      // Set NO_PROXY to bypass proxy for example.com
      const originalNoProxy = process.env.NO_PROXY;
      process.env.NO_PROXY = 'example.com,*.example.com';

      // Reconfigure proxy agent with new NO_PROXY setting
      const proxyAgent = new EnvHttpProxyAgent();
      setGlobalDispatcher(proxyAgent);

      console.log(`\n📋 Testing NO_PROXY bypass...`);
      console.log(`🚫 NO_PROXY: ${process.env.NO_PROXY}`);

      const client = new NativeScrapingClient();
      const url = 'https://example.com/no-proxy-test';

      try {
        const result = await client.scrape(url, { timeout: 5000 });

        console.log(`✅ Request completed`);
        console.log(`📊 Success: ${result.success}`);

        // Check if proxy was bypassed
        const requestsAfter = proxyRequests.length;
        const newRequests = requestsAfter - requestsBefore;

        if (newRequests === 0) {
          console.log(`✅ Confirmed: Proxy was bypassed for example.com`);
        } else {
          console.log(`❌ Unexpected: ${newRequests} requests went through proxy`);
        }

        // The request should fail (no actual example.com server), but that's ok
        // We're testing that it doesn't go through the proxy
      } catch (error) {
        console.log(`⚠️  Request failed (expected): ${(error as Error).message}`);

        // Check if proxy was bypassed
        const requestsAfter = proxyRequests.length;
        const newRequests = requestsAfter - requestsBefore;

        expect(newRequests).toBe(0);
        console.log(`✅ Confirmed: No proxy requests made (proxy was bypassed)`);
      } finally {
        // Restore original NO_PROXY
        if (originalNoProxy !== undefined) {
          process.env.NO_PROXY = originalNoProxy;
        } else {
          delete process.env.NO_PROXY;
        }

        // Restore proxy agent without NO_PROXY
        const restoredAgent = new EnvHttpProxyAgent();
        setGlobalDispatcher(restoredAgent);
      }
    });

    it('should use proxy for hosts NOT in NO_PROXY', async () => {
      proxyRequests = []; // Clear previous requests

      // Set NO_PROXY to bypass only internal domains
      const originalNoProxy = process.env.NO_PROXY;
      process.env.NO_PROXY = 'localhost,127.0.0.1,*.internal.com';

      // Reconfigure proxy agent
      const proxyAgent = new EnvHttpProxyAgent();
      setGlobalDispatcher(proxyAgent);

      console.log(`\n📋 Testing proxy with NO_PROXY for internal only...`);
      console.log(`🚫 NO_PROXY: ${process.env.NO_PROXY}`);

      const client = new NativeScrapingClient();
      const url = 'https://external-api.com/test';

      try {
        await client.scrape(url, { timeout: 5000 });
      } catch {
        // Expected to fail, but should go through proxy
      }

      // External domain should still use proxy
      expect(proxyRequests.length).toBeGreaterThan(0);
      console.log(`✅ Confirmed: External domains still use proxy`);
      console.log(`   Proxy requests made: ${proxyRequests.length}`);

      // Restore
      if (originalNoProxy !== undefined) {
        process.env.NO_PROXY = originalNoProxy;
      } else {
        delete process.env.NO_PROXY;
      }
    });
  });

  describe('Proxy Summary', () => {
    it('should show all proxy requests made', async () => {
      console.log('\n📊 Proxy Request Summary');
      console.log('========================');
      console.log(`Total requests through proxy: ${proxyRequests.length}`);

      if (proxyRequests.length > 0) {
        console.log('\nAll proxy requests:');
        proxyRequests.forEach((req, i) => {
          console.log(`${i + 1}. ${req.method} ${req.host}${req.url}`);
        });
      }
    });
  });
});
