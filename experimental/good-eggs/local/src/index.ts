#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'GOOD_EGGS_USERNAME',
      description: 'Your Good Eggs account email address',
      example: 'user@example.com',
    },
    {
      name: 'GOOD_EGGS_PASSWORD',
      description: 'Your Good Eggs account password',
      example: 'your-password',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
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

  if (!headless) {
    logWarning('config', 'Running in non-headless mode - browser window will be visible');
  }
  if (process.env.TIMEOUT) {
    logWarning('config', `Custom timeout configured: ${timeout}ms`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Create server using factory
  const { server, registerHandlers, cleanup, startBackgroundLogin } = createMCPServer();

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

  logServerStart('Good Eggs');

  // Step 6: Start background login process
  // This kicks off Playwright and performs login without blocking the stdio connection.
  // If login fails, the server will close with an error.
  logWarning('login', 'Starting background login to Good Eggs...');

  startBackgroundLogin((error: Error) => {
    // Login failed - log error and exit
    logError('login', `Background login failed: ${error.message}`);
    logError('login', 'Server shutting down due to authentication failure.');

    // Clean up and exit with error
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
