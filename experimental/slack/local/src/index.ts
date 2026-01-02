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
      name: 'SLACK_BOT_TOKEN',
      description: 'Slack Bot User OAuth Token (starts with xoxb-)',
      example: 'xoxb-YOUR-WORKSPACE-ID-YOUR-BOT-TOKEN-HERE',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly, write)',
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
    console.error('Please set the required environment variables and try again.');
    console.error('\nTo get a bot token:');
    console.error('1. Go to https://api.slack.com/apps');
    console.error('2. Create or select your app');
    console.error('3. Go to "OAuth & Permissions"');
    console.error('4. Copy the "Bot User OAuth Token"');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Validate token format
  const token = process.env.SLACK_BOT_TOKEN!;
  if (!token.startsWith('xoxb-')) {
    logWarning('validateEnvironment', 'SLACK_BOT_TOKEN should start with "xoxb-"');
  }

  // Log active tool groups if configured
  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
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

  logServerStart('Slack');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
