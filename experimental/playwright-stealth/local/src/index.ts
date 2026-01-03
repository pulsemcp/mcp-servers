#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

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
  ];

  // Log configuration
  const stealthMode = process.env.STEALTH_MODE === 'true';
  const headless = process.env.HEADLESS !== 'false';
  const timeout = process.env.TIMEOUT || '30000';

  if (stealthMode) {
    logWarning('config', 'Stealth mode enabled - using anti-detection measures');
  }
  if (!headless) {
    logWarning('config', 'Running in non-headless mode - browser window will be visible');
  }
  if (process.env.TIMEOUT) {
    logWarning('config', `Custom timeout configured: ${timeout}ms`);
  }

  // Show optional configuration if DEBUG is set
  if (process.env.DEBUG) {
    console.error('\nOptional environment variables:');
    optional.forEach(({ name, description, defaultValue }) => {
      const current = process.env[name] || defaultValue;
      console.error(`  - ${name}: ${description}`);
      console.error(`    Current: ${current}`);
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

  // Step 2: Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Step 3: Register all handlers (tools)
  await registerHandlers(server);

  // Step 4: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const stealthMode = process.env.STEALTH_MODE === 'true';
  logServerStart(`Playwright${stealthMode ? ' (Stealth)' : ''}`);
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
