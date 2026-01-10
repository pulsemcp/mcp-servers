#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, FlyIOClient } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
// Validates required environment variables at startup with helpful error messages.
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'FLY_IO_API_TOKEN',
      description: 'API token for Fly.io authentication',
      example: 'fo_abc123...',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'FLY_IO_APP_NAME',
      description: 'Optional: Scope operations to a specific app',
      defaultValue: 'not set (all apps)',
    },
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,write,admin)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip API validation at startup',
      defaultValue: 'false',
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

  // Log warnings for common configuration issues
  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
  }

  if (process.env.FLY_IO_APP_NAME) {
    logWarning('config', `Operations scoped to app: ${process.env.FLY_IO_APP_NAME}`);
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================
// Validates API credentials and connectivity before starting the server.
// This prevents silent failures and provides immediate feedback to users.
// Set SKIP_HEALTH_CHECKS=true to disable (useful for testing).
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  try {
    const client = new FlyIOClient(process.env.FLY_IO_API_TOKEN!);
    // Make a minimal API call to validate credentials
    await client.listApps();
    logServerStart('fly-io', 'stdio');
  } catch (error) {
    logError('healthcheck', `Failed to connect to Fly.io API: ${error}`);
    console.error('\nPlease check:');
    console.error('  1. Your FLY_IO_API_TOKEN is valid');
    console.error('  2. You have network connectivity to api.machines.dev');
    console.error('  3. Your token has not expired');
    console.error('\nGet a new token at: https://fly.io/user/personal_access_tokens');
    process.exit(1);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Perform health checks (validates credentials, connectivity)
  await performHealthChecks();

  // Step 3: Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Step 4: Register all handlers (tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
