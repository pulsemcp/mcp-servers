#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';
import { checkElicitationSafety } from '../shared/elicitation-config.js';
import { parseEnabledToolGroups } from '../shared/tools.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Validate required environment variables before starting
function validateEnvironment(): void {
  const required: { name: string; description: string }[] = [
    {
      name: 'PULSEMCP_ADMIN_API_KEY',
      description: 'API key for PulseMCP admin API authentication',
    },
  ];

  const optional: { name: string; description: string }[] = [];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');
    missing.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });

    if (optional.length > 0) {
      console.error('\nOptional environment variables:');
      optional.forEach(({ name, description }) => {
        console.error(`  - ${name}: ${description}`);
      });
    }

    console.error('\nPlease set the required environment variables and try again.');
    console.error('Example:');
    console.error('  export PULSEMCP_ADMIN_API_KEY="your-api-key"');
    process.exit(1);
  }
}

/**
 * Ensures the server cannot start with destructive tools enabled unless elicitation
 * is reachable (HTTP fallback) or explicitly disabled via DANGEROUSLY_SKIP_ELICITATIONS=true.
 *
 * Native MCP elicitation can't be detected at startup — it requires a connected client —
 * so without HTTP fallback URLs there is no guarantee a confirmation prompt will reach
 * the user. The check is only enforced when the operator has opted into the
 * `tenants_destructive` tool group; when that group is not enabled there are no
 * destructive tools to gate.
 */
function validateElicitationSafety(): void {
  const enabledGroups = parseEnabledToolGroups();
  const destructiveGroupEnabled = enabledGroups.includes('tenants_destructive');

  if (!destructiveGroupEnabled) {
    return;
  }

  const result = checkElicitationSafety();

  if (result.safe && result.reason === 'dangerously_skip') {
    logWarning(
      'security',
      'DANGEROUSLY_SKIP_ELICITATIONS=true — destructive tenant tools will execute without user confirmation.'
    );
    return;
  }

  if (result.safe) {
    return;
  }

  logError(
    'security',
    'Server cannot start: tenants_destructive is enabled but no elicitation mechanism is configured.'
  );
  console.error('');
  console.error('The tenants_destructive tool group enables delete_tenant and delete_api_key,');
  console.error(
    'which require user confirmation prompts (elicitation) before destroying admin data.'
  );
  console.error('Without elicitation, those tools could be invoked without any human approval.');
  console.error('');
  console.error('To fix this, choose one of the following options:');
  console.error('');
  console.error('  Option 1: Configure HTTP elicitation fallback (recommended):');
  console.error('    export ELICITATION_REQUEST_URL="https://your-endpoint/request"');
  console.error('    export ELICITATION_POLL_URL="https://your-endpoint/poll"');
  console.error('');
  console.error('  Option 2: Drop the destructive group from TOOL_GROUPS (safest):');
  console.error('    unset TOOL_GROUPS  # default has no destructive tools');
  console.error('');
  console.error('  Option 3: Explicitly opt out of elicitation (use with extreme caution):');
  console.error('    export DANGEROUSLY_SKIP_ELICITATIONS=true');
  console.error('');
  console.error('Note: native MCP client elicitation support cannot be verified at startup,');
  console.error(
    'so even clients that support it (e.g., Claude Desktop) need HTTP fallback URLs configured'
  );
  console.error('or DANGEROUSLY_SKIP_ELICITATIONS=true if the risk is accepted.');
  console.error('');

  process.exit(1);
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Validate elicitation safety when destructive tools are enabled
  validateElicitationSafety();

  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register all handlers (resources and tools)
  await registerHandlers(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('pulsemcp-cms-admin');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
