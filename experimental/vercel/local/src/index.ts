#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

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
      name: 'VERCEL_TOKEN',
      description: 'Vercel API token for authentication',
      example: 'your-vercel-api-token',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'VERCEL_TEAM_ID',
      description: 'Team ID for team-scoped operations',
      defaultValue: 'none (personal account)',
    },
    {
      name: 'VERCEL_TEAM_SLUG',
      description: 'Team URL slug for team-scoped operations',
      defaultValue: 'none (personal account)',
    },
    {
      name: 'VERCEL_ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,readwrite)',
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
    console.error('\nExample commands:');
    missing.forEach(({ name, example }) => {
      console.error(`  export ${name}="${example}"`);
    });
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  if (process.env.VERCEL_ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.VERCEL_ENABLED_TOOLGROUPS}`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('vercel-deployment-mcp-server');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
