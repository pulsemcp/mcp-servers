#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createMCPServer,
  createSSHConfigFromEnv,
  SSHClient,
  getErrorHint,
  parseHealthCheckTimeout,
} from '../shared/index.js';
import { logServerStart, logError, logWarning, logDebug } from '../shared/logging.js';

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
      name: 'SSH_HOST',
      description: 'Hostname or IP address of the remote SSH server',
      example: '192.168.1.100',
    },
    {
      name: 'SSH_USERNAME',
      description: 'Username for SSH authentication',
      example: 'deploy',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'SSH_PORT',
      description: 'SSH port number',
      defaultValue: '22',
    },
    {
      name: 'SSH_AUTH_SOCK',
      description:
        'Path to SSH agent socket for agent-based authentication (recommended for passphrase-protected keys)',
      defaultValue: 'auto-detected from environment',
    },
    {
      name: 'SSH_PRIVATE_KEY_PATH',
      description: 'Path to SSH private key file (alternative to SSH agent)',
      defaultValue: 'not set',
    },
    {
      name: 'SSH_PASSPHRASE',
      description: 'Passphrase for encrypted private key (only if not using SSH agent)',
      defaultValue: 'not set',
    },
    {
      name: 'SSH_TIMEOUT',
      description: 'Connection timeout in milliseconds',
      defaultValue: '30000',
    },
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,write,admin)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip SSH connection health check on startup (set to "true" to skip)',
      defaultValue: 'false',
    },
    {
      name: 'HEALTH_CHECK_TIMEOUT',
      description: 'Health check connection timeout in milliseconds',
      defaultValue: '10000',
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
    console.error('\nExample configuration for SSH agent authentication:');
    missing.forEach(({ name, example }) => {
      console.error(`  export ${name}="${example}"`);
    });
    console.error('  # Ensure your SSH agent is running with your key loaded:');
    console.error('  ssh-add -l');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log authentication method in use
  if (process.env.SSH_AUTH_SOCK) {
    logWarning('config', 'Using SSH agent authentication');
  } else if (process.env.SSH_PRIVATE_KEY_PATH) {
    logWarning('config', `Using private key: ${process.env.SSH_PRIVATE_KEY_PATH}`);
  } else {
    logWarning(
      'config',
      'No explicit authentication configured - will try SSH agent from environment'
    );
  }

  // Log warnings for common configuration issues
  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
  }
}

// =============================================================================
// HEALTH CHECKS (Optional)
// =============================================================================
// Validates SSH connectivity before starting the server.
// Set SKIP_HEALTH_CHECKS=true to disable (useful for testing or lazy-connection scenarios).
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  logDebug('healthcheck', 'Performing SSH connection health check...');

  // Parse health check timeout using shared utility
  const healthCheckTimeout = parseHealthCheckTimeout(process.env.HEALTH_CHECK_TIMEOUT, (msg) =>
    logWarning('healthcheck', msg)
  );

  // Create SSH config with health check timeout
  const sshConfig = createSSHConfigFromEnv();
  const healthCheckConfig = {
    ...sshConfig,
    timeout: healthCheckTimeout,
  };

  const client = new SSHClient(healthCheckConfig);

  try {
    await client.connect();
    logDebug(
      'healthcheck',
      `Health check passed - connected to ${sshConfig.host}:${sshConfig.port || 22}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide helpful error messages based on common failure scenarios
    const hint = getErrorHint(errorMessage, healthCheckTimeout);

    logError('healthcheck', `SSH connection health check failed: ${errorMessage}${hint}`);
    console.error('\n----------------------------------------');
    console.error('SSH connection health check failed!');
    console.error(`Error: ${errorMessage}${hint}`);
    console.error('\nTo skip health checks (e.g., for lazy connection scenarios), set:');
    console.error('  SKIP_HEALTH_CHECKS=true');
    console.error('----------------------------------------\n');

    process.exit(1);
  } finally {
    client.disconnect();
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

  logServerStart('ssh-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
