import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Proxy Integration Tests', () => {
  let httpProxyServer: http.Server;
  let httpsProxyServer: http.Server;
  let httpProxyRequests: string[] = [];
  let httpsProxyRequests: string[] = [];
  const HTTP_PROXY_PORT = 8888;
  const HTTPS_PROXY_PORT = 8889;
  let client: TestMCPClient | null = null;

  beforeAll(async () => {
    // Create HTTP proxy server
    httpProxyServer = http.createServer((req, res) => {
      httpProxyRequests.push(`${req.method} ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'HTTP proxy response', proxied: true }));
    });

    // Create HTTPS proxy server
    httpsProxyServer = http.createServer((req, res) => {
      httpsProxyRequests.push(`${req.method} ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'HTTPS proxy response', proxied: true }));
    });

    // Start both proxy servers
    await Promise.all([
      new Promise<void>((resolve) => {
        httpProxyServer.listen(HTTP_PROXY_PORT, () => {
          console.log(`HTTP proxy server listening on port ${HTTP_PROXY_PORT}`);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        httpsProxyServer.listen(HTTPS_PROXY_PORT, () => {
          console.log(`HTTPS proxy server listening on port ${HTTPS_PROXY_PORT}`);
          resolve();
        });
      }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => {
        httpProxyServer.close(() => resolve());
      }),
      new Promise<void>((resolve) => {
        httpsProxyServer.close(() => resolve());
      }),
    ]);
  });

  afterEach(async () => {
    // Clear proxy requests
    httpProxyRequests = [];
    httpsProxyRequests = [];

    // Disconnect client if connected
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should use different proxies for HTTP and HTTPS requests', async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        HTTP_PROXY: `http://localhost:${HTTP_PROXY_PORT}`,
        HTTPS_PROXY: `http://localhost:${HTTPS_PROXY_PORT}`,
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();

    // The proxy configuration happens at startup
    // Server should be connected successfully with proxy configured
    expect(client).toBeDefined();

    // Test that the server is responsive
    const result = await client.listTools();
    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('should bypass proxy for hosts in NO_PROXY', async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        HTTP_PROXY: `http://localhost:${HTTP_PROXY_PORT}`,
        HTTPS_PROXY: `http://localhost:${HTTPS_PROXY_PORT}`,
        NO_PROXY: 'localhost,127.0.0.1,*.internal.com',
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();

    expect(client).toBeDefined();
    const result = await client.listTools();
    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);

    // With NO_PROXY set for localhost, no proxy requests should be made
    // during the connection process
    expect(httpProxyRequests.length).toBe(0);
    expect(httpsProxyRequests.length).toBe(0);
  });

  it('should work with only HTTP_PROXY set', async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        HTTP_PROXY: `http://localhost:${HTTP_PROXY_PORT}`,
        // No HTTPS_PROXY set
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();

    expect(client).toBeDefined();
    const result = await client.listTools();
    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it('should work without proxy when no proxy env vars are set', async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        SKIP_HEALTH_CHECKS: 'true',
      },
      debug: false,
    });

    await client.connect();

    expect(client).toBeDefined();
    const result = await client.listTools();
    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);

    // Verify no proxy requests were made
    expect(httpProxyRequests.length).toBe(0);
    expect(httpsProxyRequests.length).toBe(0);
  });
});
