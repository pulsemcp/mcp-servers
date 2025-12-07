#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
// Validates required environment variables at startup with helpful error messages.
// Update this function with your server's specific requirements.
// =============================================================================

function validateEnvironment(): void {
  // TODO: Update these lists with your server's environment variables
  const required: { name: string; description: string; example: string }[] = [
    // {
    //   name: 'YOUR_API_KEY',
    //   description: 'API key for authentication with the external service',
    //   example: 'sk-abc123...'
    // },
    // {
    //   name: 'YOUR_WORKSPACE_ID',
    //   description: 'Workspace or organization ID',
    //   example: '12345'
    // }
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    // {
    //   name: 'YOUR_TIMEOUT',
    //   description: 'Request timeout in milliseconds',
    //   defaultValue: '30000'
    // },
    // {
    //   name: 'ENABLED_TOOLGROUPS',
    //   description: 'Comma-separated list of tool groups to enable (readonly,write,admin)',
    //   defaultValue: 'all groups enabled'
    // }
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
}

// =============================================================================
// HEALTH CHECKS (Optional)
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

  // TODO: Implement health checks for your external services
  // Example:
  //
  // try {
  //   const client = new YourClient(process.env.YOUR_API_KEY!);
  //   const result = await client.ping(); // Minimal API call to validate credentials
  //
  //   if (!result.ok) {
  //     logError('healthcheck', `API credentials invalid: ${result.error}`);
  //     process.exit(1);
  //   }
  //
  //   logServerStart('NAME', 'stdio'); // Include service status in startup message
  // } catch (error) {
  //   logError('healthcheck', `Failed to connect to API: ${error}`);
  //   process.exit(1);
  // }
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

  // Step 4: Register all handlers (resources and tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('NAME');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
