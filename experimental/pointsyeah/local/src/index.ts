#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, PointsYeahClient } from '../shared/index.js';
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
      name: 'POINTSYEAH_REFRESH_TOKEN',
      description:
        'AWS Cognito refresh token for PointsYeah authentication. Obtain by logging into pointsyeah.com and extracting from browser cookies.',
      example: 'eyJjdHkiOiJKV1Qi...',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly,write,admin)',
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
    console.error('How to obtain the refresh token:');
    console.error('  1. Go to https://www.pointsyeah.com/landing?route=signIn and log in');
    console.error('  2. Open browser DevTools -> Console');
    console.error('  3. Run:');
    console.error(
      "     document.cookie.split('; ').find(c => c.includes('.refreshToken=')).split('=').slice(1).join('=')"
    );
    console.error('  4. Set the output as POINTSYEAH_REFRESH_TOKEN');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  validateEnvironment();

  const refreshToken = process.env.POINTSYEAH_REFRESH_TOKEN!;

  const clientFactory = () => new PointsYeahClient(refreshToken);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('pointsyeah-mcp-server');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
