#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';
import { runOAuthSetup } from './oauth-setup.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// CLI SUBCOMMAND HANDLING
// =============================================================================

// Check for subcommands before env validation (e.g., "oauth-setup")
const subcommand = process.argv[2];
if (subcommand === 'oauth-setup') {
  runOAuthSetup(process.argv.slice(3)).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
} else {
  main().catch((error) => {
    logError('main', error);
    process.exit(1);
  });
}

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Validates that one of the two supported auth modes is fully configured.
 * Exits with a helpful message otherwise.
 */
function validateEnvironment(): void {
  const hasRefreshMode =
    process.env.X_OAUTH_CLIENT_ID &&
    process.env.X_OAUTH_CLIENT_SECRET &&
    process.env.X_OAUTH_REFRESH_TOKEN;

  const hasStaticMode = process.env.X_OAUTH_ACCESS_TOKEN;

  if (hasRefreshMode || hasStaticMode) {
    return;
  }

  // Partial refresh-mode configuration is the most likely mistake — call it out.
  const refreshVars = {
    X_OAUTH_CLIENT_ID: process.env.X_OAUTH_CLIENT_ID,
    X_OAUTH_CLIENT_SECRET: process.env.X_OAUTH_CLIENT_SECRET,
    X_OAUTH_REFRESH_TOKEN: process.env.X_OAUTH_REFRESH_TOKEN,
  };
  const hasPartialRefresh = Object.values(refreshVars).some(Boolean);

  logError('validateEnvironment', 'Missing required environment variables.');
  console.error('\nThis X (Twitter) MCP server supports two auth modes:\n');

  if (hasPartialRefresh) {
    const missing = Object.entries(refreshVars)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    console.error(`Incomplete refresh-token configuration. Missing: ${missing.join(', ')}\n`);
  }

  console.error('--- Option 1: Refresh-token mode (recommended) ---');
  console.error('  X_OAUTH_CLIENT_ID:     OAuth 2.0 client id (from the X developer portal)');
  console.error('  X_OAUTH_CLIENT_SECRET: OAuth 2.0 client secret (confidential client)');
  console.error('  X_OAUTH_REFRESH_TOKEN: Refresh token from the one-time consent flow');
  console.error('\n  Mint a refresh token:');
  console.error('    npx x-twitter-mcp-server oauth-setup <client_id> <client_secret>');
  console.error('\n--- Option 2: Static access-token mode ---');
  console.error('  X_OAUTH_ACCESS_TOKEN:  A short-lived access token injected by a central');
  console.error('                         refresher (the server will not refresh it itself)');
  console.error(
    '\nRequired scopes: tweet.read users.read bookmark.read bookmark.write offline.access'
  );
  console.error('(bookmark.write is the only write scope — it touches private bookmarks');
  console.error(' only. No public-mutation scope is ever requested.)');
  console.error('\nTools are grouped as readonly / readwrite; select via');
  console.error('X_TWITTER_ENABLED_TOOLGROUPS (comma-separated). Defaults to all groups.');
  console.error('\n======================================================\n');

  process.exit(1);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('X (Twitter)');
}
