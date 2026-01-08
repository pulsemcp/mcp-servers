#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning, logInfo } from '../shared/logging.js';
import type { ProxyConfig } from '../shared/types.js';

// =============================================================================
// PROXY CONFIGURATION
// =============================================================================

/**
 * Build proxy configuration from environment variables
 * @returns ProxyConfig if proxy is configured, undefined otherwise
 */
function buildProxyConfig(): ProxyConfig | undefined {
  const proxyUrl = process.env.PROXY_URL;
  if (!proxyUrl) {
    return undefined;
  }

  return {
    server: proxyUrl,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD,
    bypass: process.env.PROXY_BYPASS,
  };
}

/**
 * Health check the proxy connection by making a test request
 * @param proxy The proxy configuration to test
 */
async function healthCheckProxy(proxy: ProxyConfig): Promise<void> {
  logInfo('proxy', 'Performing proxy health check...');

  // Use Node.js built-in fetch with proxy agent
  // We'll use a simple approach: launch a quick browser with the proxy to test
  const { chromium } = await import('playwright');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      proxy: {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
        bypass: proxy.bypass,
      },
    });

    // Ignore HTTPS errors for residential proxies that perform HTTPS inspection
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    // Try to fetch a reliable endpoint to verify proxy works
    const response = await page.goto('https://httpbin.org/ip', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    if (!response || !response.ok()) {
      throw new Error(`Proxy health check failed: HTTP ${response?.status() ?? 'unknown'}`);
    }

    const body = await page.textContent('body');
    logInfo('proxy', `Proxy health check passed. Response: ${body?.trim()}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'STEALTH_MODE',
      description: 'Enable stealth mode to bypass anti-bot protection (true/false)',
      defaultValue: 'false',
    },
    {
      name: 'HEADLESS',
      description: 'Run browser in headless mode (true/false)',
      defaultValue: 'true',
    },
    {
      name: 'TIMEOUT',
      description: 'Default execution timeout in milliseconds',
      defaultValue: '30000',
    },
    {
      name: 'PROXY_URL',
      description: 'Proxy server URL (e.g., http://proxy.example.com:8080)',
      defaultValue: undefined,
    },
    {
      name: 'PROXY_USERNAME',
      description: 'Proxy authentication username',
      defaultValue: undefined,
    },
    {
      name: 'PROXY_PASSWORD',
      description: 'Proxy authentication password',
      defaultValue: undefined,
    },
    {
      name: 'PROXY_BYPASS',
      description: 'Comma-separated list of hosts to bypass proxy',
      defaultValue: undefined,
    },
  ];

  // Log configuration
  const stealthMode = process.env.STEALTH_MODE === 'true';
  const headless = process.env.HEADLESS !== 'false';
  const timeout = process.env.TIMEOUT || '30000';
  const proxyUrl = process.env.PROXY_URL;

  if (stealthMode) {
    logWarning('config', 'Stealth mode enabled - using anti-detection measures');
  }
  if (!headless) {
    logWarning('config', 'Running in non-headless mode - browser window will be visible');
  }
  if (process.env.TIMEOUT) {
    logWarning('config', `Custom timeout configured: ${timeout}ms`);
  }
  if (proxyUrl) {
    // Sanitize proxy URL to prevent credential leaks (in case URL contains embedded credentials)
    const sanitizedUrl = proxyUrl.replace(/\/\/[^@]+@/, '//*****@');
    logInfo('config', `Proxy configured: ${sanitizedUrl}`);
    if (process.env.PROXY_USERNAME) {
      logInfo('config', 'Proxy authentication enabled');
    }
  }

  // Show optional configuration if DEBUG is set
  if (process.env.DEBUG) {
    console.error('\nOptional environment variables:');
    optional.forEach(({ name, description, defaultValue }) => {
      // Don't log proxy password
      if (name === 'PROXY_PASSWORD') {
        const hasPassword = !!process.env[name];
        console.error(`  - ${name}: ${description}`);
        console.error(`    Current: ${hasPassword ? '***' : '(not set)'}`);
      } else {
        const current = process.env[name] || defaultValue;
        console.error(`  - ${name}: ${description}`);
        console.error(`    Current: ${current || '(not set)'}`);
      }
    });
    console.error('');
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Build proxy configuration if provided
  const proxyConfig = buildProxyConfig();

  // Step 3: If proxy is configured, perform health check
  if (proxyConfig) {
    try {
      await healthCheckProxy(proxyConfig);
    } catch (error) {
      logError(
        'proxy',
        `Proxy health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      logError('proxy', 'Please verify your proxy configuration and try again.');
      process.exit(1);
    }
  }

  // Step 4: Create server using factory, passing proxy config
  const { server, registerHandlers, cleanup } = createMCPServer(proxyConfig);

  // Step 5: Register all handlers (tools)
  await registerHandlers(server);

  // Step 6: Set up graceful shutdown
  const handleShutdown = async () => {
    logWarning('shutdown', 'Received shutdown signal, closing browser...');
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  // Step 7: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const stealthMode = process.env.STEALTH_MODE === 'true';
  const proxyEnabled = !!proxyConfig;
  logServerStart(`Playwright${stealthMode ? ' (Stealth)' : ''}${proxyEnabled ? ' (Proxy)' : ''}`);
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
