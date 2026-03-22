#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
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
      name: 'AETNA_USERNAME',
      description: 'Your Aetna account username',
      example: 'your-username',
    },
    {
      name: 'AETNA_PASSWORD',
      description: 'Your Aetna account password',
      example: 'your-password',
    },
    {
      name: 'EMAIL_IMAP_USER',
      description: 'Email address for receiving 2FA codes',
      example: 'user@gmail.com',
    },
    {
      name: 'EMAIL_IMAP_PASSWORD',
      description: 'Email password or app-specific password for IMAP access',
      example: 'your-app-password',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'EMAIL_IMAP_HOST',
      description: 'IMAP server host',
      defaultValue: 'imap.gmail.com',
    },
    {
      name: 'EMAIL_IMAP_PORT',
      description: 'IMAP server port',
      defaultValue: '993',
    },
    {
      name: 'HEADLESS',
      description: 'Run browser in headless mode (true/false)',
      defaultValue: 'true',
    },
    {
      name: 'TIMEOUT',
      description: 'Default timeout for browser operations in milliseconds',
      defaultValue: '30000',
    },
    {
      name: 'AETNA_DOWNLOAD_DIR',
      description: 'Directory to save downloaded documents',
      defaultValue: '/tmp/aetna-downloads',
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
    console.error('Please set the required environment variables and try again.');
    console.error('\nExample commands:');
    missing.forEach(({ name, example }) => {
      console.error(`  export ${name}="${example}"`);
    });
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log configuration
  const headless = process.env.HEADLESS !== 'false';
  const timeout = process.env.TIMEOUT || '30000';
  const downloadDir = process.env.AETNA_DOWNLOAD_DIR || '/tmp/aetna-downloads';

  if (!headless) {
    logWarning('config', 'Running in non-headless mode - browser window will be visible');
  }
  if (process.env.TIMEOUT) {
    logWarning('config', `Custom timeout configured: ${timeout}ms`);
  }
  if (process.env.AETNA_DOWNLOAD_DIR) {
    logWarning('config', `Custom download directory: ${downloadDir}`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Create server using factory
  const { server, registerHandlers, cleanup, startBackgroundLogin } = createMCPServer({
    version: VERSION,
  });

  // Step 3: Register all handlers (tools)
  await registerHandlers(server);

  // Step 4: Set up graceful shutdown
  const handleShutdown = async () => {
    logWarning('shutdown', 'Received shutdown signal, closing browser...');
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Aetna Claims');

  // Step 6: Start background login process (includes 2FA via email)
  logWarning('login', 'Starting background login to Aetna (may require email 2FA)...');

  startBackgroundLogin((error: Error) => {
    logError('login', `Background login failed: ${error.message}`);
    logError('login', 'Server shutting down due to authentication failure.');

    cleanup()
      .catch((cleanupError) => {
        logError('cleanup', `Error during cleanup: ${cleanupError}`);
      })
      .finally(() => {
        process.exit(1);
      });
  });
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
