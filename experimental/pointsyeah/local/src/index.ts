#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, PointsYeahClient, setPlaywrightAvailable } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'POINTSYEAH_REFRESH_TOKEN',
      description:
        'AWS Cognito refresh token for PointsYeah authentication. Obtain by logging into pointsyeah.com and extracting from browser cookies.',
      example: 'eyJjdHkiOiJKV1Qi...',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,write,admin)',
      defaultValue: 'all groups enabled',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');

    missing.forEach(({ name, description, example }) => {
      console.error(`  - ${name}: ${description}`);
      console.error(`    Example: ${example}`);
    });

    if (optional.length > 0) {
      console.error('\nOptional environment variables:');
      optional.forEach(({ name, description, defaultValue }) => {
        const defaultStr = defaultValue ? ` (default: ${defaultValue})` : '';
        console.error(`  - ${name}: ${description}${defaultStr}`);
      });
    }

    console.error('\n----------------------------------------');
    console.error('How to obtain the refresh token:');
    console.error('  1. Go to https://www.pointsyeah.com/landing?route=signIn and log in');
    console.error('  2. Open browser DevTools -> Console');
    console.error('  3. Run:');
    console.error(
      "     document.cookie.split('; ').find(c => c.includes('.refreshToken=')).split('=').slice(1).join('=')"
    );
    console.error('  4. Set the output as POINTSYEAH_REFRESH_TOKEN');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
  }
}

// =============================================================================
// PLAYWRIGHT BROWSER FACTORY
// =============================================================================

interface PlaywrightBrowserContext {
  addCookies: (
    cookies: Array<{ name: string; value: string; domain: string; path: string }>
  ) => Promise<void>;
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
}

interface PlaywrightPage {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  waitForResponse: (
    predicate: (response: PlaywrightResponse) => boolean,
    options?: { timeout?: number }
  ) => Promise<PlaywrightResponse>;
  close: () => Promise<void>;
}

interface PlaywrightResponse {
  url: () => string;
  json: () => Promise<unknown>;
}

/**
 * Create a Playwright browser context factory.
 * Playwright is dynamically imported to keep it as an optional dependency.
 */
function createPlaywrightDeps(): { launchBrowser: () => Promise<PlaywrightBrowserContext> } {
  return {
    launchBrowser: async () => {
      // Dynamic import so Playwright is not required at module load time.
      // Use a variable to prevent TypeScript from statically resolving the module.
      const moduleName = 'playwright';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pw: any = await import(moduleName);
      const browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      return {
        addCookies: async (
          cookies: Array<{ name: string; value: string; domain: string; path: string }>
        ) => {
          await context.addCookies(cookies);
        },
        newPage: async () => {
          const page = await context.newPage();
          return {
            goto: async (url: string, options?: { waitUntil?: string; timeout?: number }) => {
              await page.goto(url, {
                waitUntil: (options?.waitUntil as 'domcontentloaded') || 'domcontentloaded',
                timeout: options?.timeout || 60000,
              });
            },
            waitForResponse: async (
              predicate: (response: PlaywrightResponse) => boolean,
              options?: { timeout?: number }
            ) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const response = await page.waitForResponse(
                (resp: { url: () => string; json: () => Promise<unknown> }) =>
                  predicate({ url: () => resp.url(), json: () => resp.json() }),
                { timeout: options?.timeout || 60000 }
              );
              return { url: () => response.url(), json: () => response.json() };
            },
            close: async () => {
              await page.close();
            },
          };
        },
        close: async () => {
          await context.close();
          await browser.close();
        },
      };
    },
  };
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  validateEnvironment();

  const refreshToken = process.env.POINTSYEAH_REFRESH_TOKEN!;

  // Try to set up Playwright
  let playwrightDeps: ReturnType<typeof createPlaywrightDeps>;
  try {
    playwrightDeps = createPlaywrightDeps();
    setPlaywrightAvailable(true);
  } catch {
    logWarning(
      'playwright',
      'Playwright not available. Flight search will not work. Install playwright to enable search.'
    );
    playwrightDeps = {
      launchBrowser: async () => {
        throw new Error(
          'Playwright is not installed. Install it with: npx playwright install chromium'
        );
      },
    };
  }

  const clientFactory = () => new PointsYeahClient(refreshToken, playwrightDeps);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('pointsyeah-mcp-server');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
