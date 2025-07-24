#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { runHealthChecks } from '../shared/healthcheck.js';
import { ProxyAgent } from 'proxy-agent';
import http from 'http';
import https from 'https';

// Configure proxy settings using proxy-agent (if enabled)
function configureProxy() {
  const enableProxy = process.env.ENABLE_PROXY_SETTINGS === 'true';

  if (!enableProxy) {
    console.error('Proxy support disabled (set ENABLE_PROXY_SETTINGS=true to enable)');
    return;
  }

  console.error('Proxy support enabled via ENABLE_PROXY_SETTINGS');

  // ProxyAgent automatically detects proxy settings from:
  // 1. Environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY)
  // 2. npm configuration
  // 3. System proxy settings (on macOS and Windows)
  // 4. PAC files if configured
  const proxyAgent = new ProxyAgent();

  // Set as global agents for all HTTP/HTTPS requests
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;

  // Log detected proxy configuration for debugging
  // Note: proxy-agent doesn't expose the detected proxy directly,
  // but we can still check env vars for logging purposes
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  if (httpProxy || httpsProxy) {
    console.error('Proxy configuration detected:');
    if (httpProxy) console.error(`  HTTP_PROXY: ${httpProxy}`);
    if (httpsProxy) console.error(`  HTTPS_PROXY: ${httpsProxy}`);
    if (noProxy) console.error(`  NO_PROXY: ${noProxy}`);
    console.error('Note: proxy-agent also checks system proxy settings and PAC files');
  } else {
    // Even without env vars, proxy-agent might detect system settings
    console.error('Checking for system proxy settings...');
  }
}

// Validate environment variables
function validateEnvironment() {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const brightDataKey = process.env.BRIGHTDATA_API_KEY;
  const optimizeFor = process.env.OPTIMIZE_FOR;

  const services = [];
  if (!firecrawlKey) {
    services.push('Firecrawl');
  }
  if (!brightDataKey) {
    services.push('BrightData');
  }

  if (services.length === 2) {
    console.error('Pulse Fetch starting with services: native');
  } else if (services.length === 1) {
    const availableService = services[0] === 'Firecrawl' ? 'BrightData' : 'Firecrawl';
    console.error(`Pulse Fetch starting with services: native, ${availableService}`);
  } else {
    console.error('Pulse Fetch starting with services: native, Firecrawl, BrightData');
  }

  if (optimizeFor && !['cost', 'speed'].includes(optimizeFor)) {
    console.error(`Warning: Invalid OPTIMIZE_FOR value '${optimizeFor}'. Using default 'cost'.`);
  }

  // Log current optimization mode
  const mode = optimizeFor === 'speed' ? 'speed' : 'cost';
  console.error(`Optimization mode: ${mode}`);

  // Log storage configuration
  const storageType = process.env.MCP_RESOURCE_STORAGE || 'memory';
  console.error(`Resource storage: ${storageType}`);
  if (storageType === 'filesystem') {
    const storageRoot = process.env.MCP_RESOURCE_FILESYSTEM_ROOT || '/tmp/pulse-fetch/resources';
    console.error(`Storage location: ${storageRoot}`);
  }
}

async function main() {
  // Configure proxy before any HTTP requests
  configureProxy();

  validateEnvironment();

  // Run health checks if SKIP_HEALTH_CHECKS is not set
  if (process.env.SKIP_HEALTH_CHECKS !== 'true') {
    console.error('Running authentication health checks...');
    const healthCheckErrors = await runHealthChecks();

    if (healthCheckErrors.length > 0) {
      console.error('\nAuthentication health check failures:');
      healthCheckErrors.forEach((error) => {
        console.error(`  ${error}`);
      });
      console.error('\nTo skip health checks, set SKIP_HEALTH_CHECKS=true');
      process.exit(1);
    }
  }

  const { server, registerHandlers } = createMCPServer();
  const transport = new StdioServerTransport();

  registerHandlers(server);
  await server.connect(transport);

  // Cleanup handler
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
