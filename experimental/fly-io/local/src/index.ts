#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  createMCPServer,
  FlyIOClient,
  DockerCLIClient,
  parseEnabledToolGroups,
  validateToolGroupConfig,
} from '../shared/index.js';
import { logServerStart, logError, logWarning, logDebug } from '../shared/logging.js';

const execFileAsync = promisify(execFile);

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

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
      name: 'ENABLED_TOOLGROUPS',
      description:
        'Comma-separated list of tool groups to enable (readonly,write,admin,apps,machines,logs,ssh,images,registry)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip API validation at startup',
      defaultValue: 'false',
    },
    {
      name: 'DISABLE_DOCKER_CLI_TOOLS',
      description: 'Disable Docker CLI-based tools (registry tools)',
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
// CLI TOOL CHECKS
// =============================================================================
// Verifies that required CLI tools (fly, docker) are available.
// =============================================================================

interface CLICheckResult {
  flyAvailable: boolean;
  flyVersion?: string;
  dockerAvailable: boolean;
  dockerVersion?: string;
}

async function checkCLITools(checkDocker: boolean): Promise<CLICheckResult> {
  const result: CLICheckResult = {
    flyAvailable: false,
    dockerAvailable: false,
  };

  // Check fly CLI
  try {
    const { stdout } = await execFileAsync('fly', ['version'], { timeout: 5000 });
    result.flyAvailable = true;
    result.flyVersion = stdout.trim().split('\n')[0];
    logDebug('cli-check', `fly CLI: ${result.flyVersion}`);
  } catch {
    result.flyAvailable = false;
  }

  // Check docker CLI (only if requested)
  if (checkDocker) {
    try {
      const { stdout } = await execFileAsync('docker', ['--version'], { timeout: 5000 });
      result.dockerAvailable = true;
      result.dockerVersion = stdout.trim();
      logDebug('cli-check', `docker CLI: ${result.dockerVersion}`);
    } catch {
      result.dockerAvailable = false;
    }
  }

  return result;
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================
// Validates API credentials and connectivity before starting the server.
// This prevents silent failures and provides immediate feedback to users.
// Set SKIP_HEALTH_CHECKS=true to disable (useful for testing).
// =============================================================================

async function performHealthChecks(dockerDisabled: boolean): Promise<CLICheckResult> {
  const cliCheck = await checkCLITools(!dockerDisabled);

  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return cliCheck;
  }

  // Check fly CLI availability
  if (!cliCheck.flyAvailable) {
    logError('healthcheck', 'fly CLI not found');
    console.error('\nThe fly CLI is required for this server to work.');
    console.error('Please install it: https://fly.io/docs/hands-on/install-flyctl/');
    process.exit(1);
  }

  // Check docker CLI availability (only if Docker tools are enabled)
  if (!dockerDisabled && !cliCheck.dockerAvailable) {
    logWarning(
      'healthcheck',
      'docker CLI not found - registry tools will be disabled. ' +
        'Set DISABLE_DOCKER_CLI_TOOLS=true to suppress this warning.'
    );
  }

  // Validate API credentials
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

  return cliCheck;
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Determine Docker configuration
  const dockerDisabled = process.env.DISABLE_DOCKER_CLI_TOOLS === 'true';

  // Step 3: Validate tool group configuration
  // This will throw an error if registry group is explicitly enabled but Docker is disabled
  const enabledGroups = parseEnabledToolGroups(process.env.ENABLED_TOOLGROUPS);
  validateToolGroupConfig(enabledGroups, dockerDisabled);

  // Step 4: Perform health checks (validates credentials, connectivity, CLI tools)
  const cliCheck = await performHealthChecks(dockerDisabled);

  // Step 5: Determine if Docker tools should be enabled
  // Docker tools are disabled if:
  // - DISABLE_DOCKER_CLI_TOOLS=true, OR
  // - Docker CLI is not available (and not explicitly disabled)
  const effectiveDockerDisabled = dockerDisabled || !cliCheck.dockerAvailable;

  // Step 6: Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Step 7: Register all handlers (tools)
  // Pass Docker client factory if Docker is available
  const dockerClientFactory = !effectiveDockerDisabled
    ? () => new DockerCLIClient(process.env.FLY_IO_API_TOKEN!)
    : undefined;

  await registerHandlers(server, {
    dockerClientFactory,
    dockerDisabled: effectiveDockerDisabled,
  });

  // Step 8: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
