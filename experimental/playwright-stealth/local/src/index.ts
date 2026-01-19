#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning, logInfo } from '../shared/logging.js';
import type { ProxyConfig, BrowserPermission } from '../shared/types.js';
import { ALL_BROWSER_PERMISSIONS } from '../shared/types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// PERMISSIONS CONFIGURATION
// =============================================================================

/**
 * Parse browser permissions from environment variable.
 * If BROWSER_PERMISSIONS is not set, returns undefined (which means grant all permissions).
 * If BROWSER_PERMISSIONS is set, returns the parsed list of permissions.
 * Invalid permissions are logged as warnings and skipped.
 */
function parseBrowserPermissions(): BrowserPermission[] | undefined {
  const permissionsEnv = process.env.BROWSER_PERMISSIONS;
  if (!permissionsEnv) {
    // No constraint specified - will grant all permissions by default
    return undefined;
  }

  const requestedPermissions = permissionsEnv.split(',').map((p) => p.trim().toLowerCase());
  const validPermissions: BrowserPermission[] = [];
  const invalidPermissions: string[] = [];

  for (const perm of requestedPermissions) {
    if (perm === '') continue;
    if (ALL_BROWSER_PERMISSIONS.includes(perm as BrowserPermission)) {
      validPermissions.push(perm as BrowserPermission);
    } else {
      invalidPermissions.push(perm);
    }
  }

  if (invalidPermissions.length > 0) {
    logWarning(
      'config',
      `Unknown browser permissions ignored: ${invalidPermissions.join(', ')}. ` +
        `Valid permissions: ${ALL_BROWSER_PERMISSIONS.join(', ')}`
    );
  }

  return validPermissions;
}

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
      name: 'STEALTH_USER_AGENT',
      description: 'Custom User-Agent string for stealth mode (overrides default)',
      defaultValue: undefined,
    },
    {
      name: 'STEALTH_MASK_LINUX',
      description: 'Mask Linux platform as Windows in stealth mode (true/false)',
      defaultValue: 'true',
    },
    {
      name: 'STEALTH_LOCALE',
      description: 'Custom locale for Accept-Language header (e.g., en-US,en)',
      defaultValue: 'en-US,en',
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
    {
      name: 'BROWSER_PERMISSIONS',
      description:
        'Comma-separated list of browser permissions to grant. If not set, ALL permissions are granted.',
      defaultValue: 'all (notifications, geolocation, camera, microphone, clipboard-read, etc.)',
    },
    {
      name: 'IGNORE_HTTPS_ERRORS',
      description:
        'Ignore HTTPS certificate errors (true/false). Set to false for stricter security.',
      defaultValue: 'true',
    },
  ];

  // Log configuration
  const stealthMode = process.env.STEALTH_MODE === 'true';
  const headless = process.env.HEADLESS !== 'false';
  const timeout = process.env.TIMEOUT || '30000';
  const proxyUrl = process.env.PROXY_URL;
  const browserPermissions = process.env.BROWSER_PERMISSIONS;

  if (stealthMode) {
    logWarning('config', 'Stealth mode enabled - using anti-detection measures');
    // Log stealth-specific configuration
    if (process.env.STEALTH_USER_AGENT) {
      logInfo('config', `Custom User-Agent: ${process.env.STEALTH_USER_AGENT}`);
    }
    if (process.env.STEALTH_MASK_LINUX === 'false') {
      logInfo('config', 'Linux platform masking disabled');
    }
    if (process.env.STEALTH_LOCALE) {
      logInfo('config', `Custom locale: ${process.env.STEALTH_LOCALE}`);
    }
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
  if (browserPermissions) {
    logInfo('config', `Browser permissions constrained to: ${browserPermissions}`);
  } else {
    logInfo('config', 'Browser permissions: all (default)');
  }
  if (process.env.IGNORE_HTTPS_ERRORS === 'false') {
    logInfo('config', 'HTTPS certificate validation enabled (strict mode)');
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

  // Step 3: Parse browser permissions (undefined = all permissions granted)
  const browserPermissions = parseBrowserPermissions();

  // Step 4: If proxy is configured, perform health check
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

  // Step 5: Parse IGNORE_HTTPS_ERRORS setting (default: true)
  const ignoreHttpsErrors = process.env.IGNORE_HTTPS_ERRORS !== 'false';

  // Step 6: Create server using factory, passing proxy config, permissions, and HTTPS error handling
  const { server, registerHandlers, cleanup } = createMCPServer({
    version: VERSION,
    proxy: proxyConfig,
    permissions: browserPermissions,
    ignoreHttpsErrors,
  });

  // Step 7: Register all handlers (tools)
  await registerHandlers(server);

  // Step 8: Set up graceful shutdown
  const handleShutdown = async () => {
    logWarning('shutdown', 'Received shutdown signal, closing browser...');
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  // Step 9: Start server with stdio transport
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
