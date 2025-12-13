#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
// Validates required environment variables at startup with helpful error messages.
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'AGENT_ORCHESTRATOR_BASE_URL',
      description: 'Base URL for the Agent Orchestrator API',
      example: 'http://localhost:3000',
    },
    {
      name: 'AGENT_ORCHESTRATOR_API_KEY',
      description: 'API key for authentication with the Agent Orchestrator',
      example: 'your_api_key_here',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
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
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================
// Validates API credentials and connectivity before starting the server.
// Set SKIP_HEALTH_CHECKS=true to disable (useful for testing).
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  // For agent-orchestrator, we could add a health check by calling the sessions endpoint
  // For now, we skip complex validation since the API might not always be available
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

  logServerStart('agent-orchestrator');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
