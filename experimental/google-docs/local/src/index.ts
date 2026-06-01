#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';
import { runOAuthSetup } from './oauth-setup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// CLI SUBCOMMAND HANDLING
// =============================================================================

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

function validateEnvironment(): void {
  const hasOAuth2 =
    process.env.GOOGLE_DOCS_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_DOCS_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_DOCS_OAUTH_REFRESH_TOKEN;

  const hasServiceAccount =
    process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_DOCS_IMPERSONATE_EMAIL;

  if (hasOAuth2 || hasServiceAccount) {
    return;
  }

  const oauthVars = {
    GOOGLE_DOCS_OAUTH_CLIENT_ID: process.env.GOOGLE_DOCS_OAUTH_CLIENT_ID,
    GOOGLE_DOCS_OAUTH_CLIENT_SECRET: process.env.GOOGLE_DOCS_OAUTH_CLIENT_SECRET,
    GOOGLE_DOCS_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_DOCS_OAUTH_REFRESH_TOKEN,
  };
  const hasPartialOAuth2 = Object.values(oauthVars).some(Boolean);

  if (hasPartialOAuth2) {
    const missingOAuth = Object.entries(oauthVars)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    logError('validateEnvironment', 'Incomplete OAuth2 configuration. Missing:');
    for (const varName of missingOAuth) {
      console.error(`  - ${varName}`);
    }
    console.error('\nOAuth2 mode requires all three variables:');
    console.error('  GOOGLE_DOCS_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console');
    console.error('  GOOGLE_DOCS_OAUTH_CLIENT_SECRET: OAuth2 client secret');
    console.error('  GOOGLE_DOCS_OAUTH_REFRESH_TOKEN: Refresh token from one-time consent flow');
    console.error('\nRun the setup script to obtain a refresh token:');
    console.error('  npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>');
    console.error('\n======================================================\n');
    process.exit(1);
  }

  const serviceAccountVars = {
    GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL: process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL,
    GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_DOCS_IMPERSONATE_EMAIL: process.env.GOOGLE_DOCS_IMPERSONATE_EMAIL,
  };
  const hasPartialServiceAccount = Object.values(serviceAccountVars).some(Boolean);

  if (hasPartialServiceAccount) {
    const missingServiceAccount = Object.entries(serviceAccountVars)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    logError('validateEnvironment', 'Incomplete service account configuration. Missing:');
    for (const varName of missingServiceAccount) {
      console.error(`  - ${varName}`);
    }
    console.error('\nService account mode requires all three variables:');
    console.error('  GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address');
    console.error(
      '  GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)'
    );
    console.error('  GOOGLE_DOCS_IMPERSONATE_EMAIL: Email address to impersonate');
    console.error('\nSetup steps:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a service account with domain-wide delegation');
    console.error('  3. In Google Workspace Admin, grant Docs and Drive scopes:');
    console.error('       https://www.googleapis.com/auth/documents');
    console.error('       https://www.googleapis.com/auth/drive');
    console.error('  4. Download the JSON key and extract client_email and private_key');
    console.error('\n======================================================\n');
    process.exit(1);
  }

  logError('validateEnvironment', 'Missing required environment variables:');

  console.error('\nThis MCP server supports two authentication modes:\n');
  console.error('--- Option 1: OAuth2 (for personal Google accounts) ---');
  console.error('  GOOGLE_DOCS_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console');
  console.error('  GOOGLE_DOCS_OAUTH_CLIENT_SECRET: OAuth2 client secret');
  console.error('  GOOGLE_DOCS_OAUTH_REFRESH_TOKEN: Refresh token from one-time consent flow');
  console.error(
    '\n  Setup: Run `npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>`'
  );
  console.error('\n--- Option 2: Service Account (for Google Workspace) ---');
  console.error('  GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address');
  console.error('    Example: my-service-account@my-project.iam.gserviceaccount.com');
  console.error(
    '  GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)'
  );
  console.error('    Example: -----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----');
  console.error('  GOOGLE_DOCS_IMPERSONATE_EMAIL: Email address to impersonate');
  console.error('    Example: user@yourdomain.com');
  console.error('\n  Setup steps:');
  console.error('  1. Go to https://console.cloud.google.com/');
  console.error('  2. Create a service account with domain-wide delegation');
  console.error('  3. In Google Workspace Admin, grant Docs and Drive scopes:');
  console.error('       https://www.googleapis.com/auth/documents');
  console.error('       https://www.googleapis.com/auth/drive');
  console.error('  4. Download the JSON key file and extract client_email and private_key');
  console.error('\nOptional environment variables:');
  console.error('  GOOGLE_DOCS_ENABLED_TOOLGROUPS: Comma-separated list of tool groups to enable');
  console.error('    Valid groups: readonly, readwrite, readwrite_external');
  console.error('    Default: all groups enabled');
  console.error('    Example: GOOGLE_DOCS_ENABLED_TOOLGROUPS=readwrite');
  console.error('\n======================================================\n');

  process.exit(1);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  validateEnvironment();

  if (process.env.GOOGLE_DOCS_ENABLED_TOOLGROUPS) {
    logWarning('config', `Enabled tool groups: ${process.env.GOOGLE_DOCS_ENABLED_TOOLGROUPS}`);
  }

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Google Docs');
}
