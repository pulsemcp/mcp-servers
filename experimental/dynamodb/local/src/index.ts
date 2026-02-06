#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, parseToolFilterConfig } from '../shared/index.js';
import { logServerStart, logError, logWarning, logDebug } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'AWS_ACCESS_KEY_ID',
      description: 'AWS access key ID (uses default credential chain if not set)',
      defaultValue: 'from AWS credential chain',
    },
    {
      name: 'AWS_SECRET_ACCESS_KEY',
      description: 'AWS secret access key (uses default credential chain if not set)',
      defaultValue: 'from AWS credential chain',
    },
    {
      name: 'DYNAMODB_ENDPOINT',
      description: 'Custom DynamoDB endpoint (for local DynamoDB or LocalStack)',
      defaultValue: 'AWS default endpoint',
    },
    {
      name: 'DYNAMODB_ENABLED_TOOL_GROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly, readwrite, admin)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'DYNAMODB_ENABLED_TOOLS',
      description: 'Comma-separated whitelist of specific tools to enable',
      defaultValue: 'all tools in enabled groups',
    },
    {
      name: 'DYNAMODB_DISABLED_TOOLS',
      description: 'Comma-separated blacklist of specific tools to disable',
      defaultValue: 'none',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip startup health checks',
      defaultValue: 'false',
    },
  ];

  // Check for AWS_REGION or AWS_DEFAULT_REGION
  const hasRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  if (!hasRegion) {
    logError('validateEnvironment', 'Missing required environment variables:');
    console.error(`  - AWS_REGION or AWS_DEFAULT_REGION: AWS region for DynamoDB`);
    console.error(`    Example: us-east-1`);

    console.error('\nOptional environment variables:');
    optional.forEach(({ name, description, defaultValue }) => {
      const defaultStr = defaultValue ? ` (default: ${defaultValue})` : '';
      console.error(`  - ${name}: ${description}${defaultStr}`);
    });

    console.error('\n----------------------------------------');
    console.error('Please set the required environment variables and try again.');
    console.error('\nExample commands:');
    console.error(`  export AWS_REGION="us-east-1"`);
    console.error(`  export AWS_ACCESS_KEY_ID="your-access-key"`);
    console.error(`  export AWS_SECRET_ACCESS_KEY="your-secret-key"`);
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log configuration info
  const toolConfig = parseToolFilterConfig();
  if (toolConfig.enabledToolGroups) {
    logWarning('config', `Tool groups filter active: ${toolConfig.enabledToolGroups.join(', ')}`);
  }
  if (toolConfig.enabledTools) {
    logWarning('config', `Tool whitelist active: ${toolConfig.enabledTools.join(', ')}`);
  }
  if (toolConfig.disabledTools) {
    logWarning('config', `Tool blacklist active: ${toolConfig.disabledTools.join(', ')}`);
  }

  logDebug('config', `Region: ${process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION}`);
  if (process.env.DYNAMODB_ENDPOINT) {
    logDebug('config', `Custom endpoint: ${process.env.DYNAMODB_ENDPOINT}`);
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  // DynamoDB health check would be done lazily on first request
  // We skip explicit health check since ListTables would fail without proper credentials
  // and that's fine - the error will be clear when the user tries to use a tool
  logDebug('healthcheck', 'DynamoDB connection will be validated on first request');
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Perform health checks
  await performHealthChecks();

  // Step 3: Create server using factory with tool filter config
  const toolFilterConfig = parseToolFilterConfig();
  const { server, registerHandlers } = createMCPServer({
    version: VERSION,
    toolFilterConfig,
  });

  // Step 4: Register all handlers (resources and tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('dynamodb-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
