#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, OnePasswordClient } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';
import { checkElicitationSafety } from '../shared/elicitation-config.js';

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
      name: 'OP_SERVICE_ACCOUNT_TOKEN',
      description: '1Password service account token for authentication',
      example: 'ops_...',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,write)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip health checks on startup (true/false)',
      defaultValue: 'false',
    },
    {
      name: 'DANGEROUSLY_SKIP_ELICITATIONS',
      description:
        'Set to "true" to bypass ALL confirmation prompts (exposes all secrets without approval)',
      defaultValue: 'not set (elicitation required)',
    },
    {
      name: 'OP_ELICITATION_READ',
      description: 'Prompt before revealing credentials (true/false)',
      defaultValue: 'true',
    },
    {
      name: 'OP_ELICITATION_WRITE',
      description: 'Prompt before creating items (true/false)',
      defaultValue: 'true',
    },
    {
      name: 'OP_WHITELISTED_ITEMS',
      description: 'Comma-separated item titles or IDs that bypass read elicitation',
      defaultValue: 'none',
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

  // Validate elicitation safety
  validateElicitationSafety();
}

/**
 * Ensures the server cannot start without elicitation protection unless explicitly opted out.
 *
 * Without this check, the server would silently allow carte blanche access to all 1Password
 * secrets when elicitation is not configured — a dangerous default for a credentials manager.
 *
 * The server will start if ANY of the following is true:
 * 1. HTTP fallback URLs are configured (ELICITATION_REQUEST_URL + ELICITATION_POLL_URL)
 * 2. DANGEROUSLY_SKIP_ELICITATIONS=true is explicitly set
 *
 * If neither condition is met, the server refuses to start. Native MCP client elicitation
 * support cannot be detected at startup (it requires an active client connection), so
 * users relying solely on native elicitation should configure HTTP fallback URLs as well,
 * or set DANGEROUSLY_SKIP_ELICITATIONS=true if they accept the risk.
 */
function validateElicitationSafety(): void {
  const result = checkElicitationSafety();

  if (result.safe && result.reason === 'dangerously_skip') {
    logWarning(
      'security',
      'DANGEROUSLY_SKIP_ELICITATIONS=true — all confirmation prompts are disabled. ' +
        'All secrets will be accessible without user approval.'
    );
    return;
  }

  if (result.safe) {
    // HTTP fallback is configured, elicitation will work
    return;
  }

  // No elicitation mechanism is guaranteed to be available at startup
  logError('security', 'Server cannot start: no elicitation mechanism is configured.');
  console.error('');
  console.error('This 1Password MCP server requires user confirmation prompts (elicitation) to be');
  console.error(
    'configured before it will start. Without elicitation, all secrets would be accessible'
  );
  console.error('to any connected MCP client without user approval.');
  console.error('');
  console.error('To fix this, choose one of the following options:');
  console.error('');
  console.error('  Option 1: Configure HTTP elicitation fallback (recommended):');
  console.error('    export ELICITATION_REQUEST_URL="https://your-endpoint/request"');
  console.error('    export ELICITATION_POLL_URL="https://your-endpoint/poll"');
  console.error('');
  console.error('  Option 2: Explicitly opt out of elicitation (use with caution):');
  console.error('    export DANGEROUSLY_SKIP_ELICITATIONS=true');
  console.error('');
  console.error('Note: If your MCP client supports native elicitation (e.g., Claude Desktop),');
  console.error(
    'you still need to configure HTTP fallback URLs or set DANGEROUSLY_SKIP_ELICITATIONS=true'
  );
  console.error('since native support cannot be verified at server startup time.');
  console.error('');

  process.exit(1);
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  try {
    const client = new OnePasswordClient(process.env.OP_SERVICE_ACCOUNT_TOKEN!);
    // Simple health check - list vaults to verify credentials work
    await client.getVaults();
  } catch (error) {
    logError('healthcheck', `Failed to connect to 1Password: ${error}`);
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
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Step 4: Register all handlers (resources and tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('onepassword-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
