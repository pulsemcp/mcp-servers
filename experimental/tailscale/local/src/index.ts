#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Validate required environment variables before starting.
//
// Auth is satisfied by EITHER a personal API access token (TAILSCALE_API_KEY)
// OR an OAuth client (TAILSCALE_OAUTH_CLIENT_ID + TAILSCALE_OAUTH_CLIENT_SECRET).
function validateEnvironment(): void {
  const hasApiKey = !!process.env.TAILSCALE_API_KEY;
  const hasOauth =
    !!process.env.TAILSCALE_OAUTH_CLIENT_ID && !!process.env.TAILSCALE_OAUTH_CLIENT_SECRET;

  const optional: { name: string; description: string }[] = [
    {
      name: 'TAILSCALE_TAILNET',
      description: "Tailnet to operate on (default: '-', the credential's default tailnet)",
    },
    {
      name: 'TAILSCALE_API_URL',
      description: 'Base URL for the Tailscale API (default: https://api.tailscale.com/api/v2)',
    },
    {
      name: 'TOOL_GROUPS',
      description:
        'Comma-separated list of enabled tool groups (default: policy,devices,keys). ' +
        'Append _readonly to a group for read-only access, e.g. "policy_readonly,devices_readonly"',
    },
  ];

  if (!hasApiKey && !hasOauth) {
    logError('validateEnvironment', 'Missing required Tailscale credentials.');
    console.error('Provide EITHER:');
    console.error('  - TAILSCALE_API_KEY: a Tailscale API access token');
    console.error('OR both:');
    console.error('  - TAILSCALE_OAUTH_CLIENT_ID: OAuth client ID');
    console.error('  - TAILSCALE_OAUTH_CLIENT_SECRET: OAuth client secret');

    console.error('\nOptional environment variables:');
    optional.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });

    console.error('\nPlease set the required environment variables and try again.');
    console.error('Example:');
    console.error('  export TAILSCALE_API_KEY="tskey-api-..."');
    process.exit(1);
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register all handlers (tools)
  await registerHandlers(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('tailscale-vpn-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
