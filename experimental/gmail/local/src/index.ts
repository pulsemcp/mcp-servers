#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
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
  // Check for OAuth2 credentials
  const hasOAuth2 =
    process.env.GMAIL_OAUTH_CLIENT_ID &&
    process.env.GMAIL_OAUTH_CLIENT_SECRET &&
    process.env.GMAIL_OAUTH_REFRESH_TOKEN;

  // Check for service account credentials
  const hasServiceAccount =
    process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL &&
    process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GMAIL_IMPERSONATE_EMAIL;

  if (hasOAuth2 || hasServiceAccount) {
    return;
  }

  // Check for partial OAuth2 configuration
  const oauthVars = {
    GMAIL_OAUTH_CLIENT_ID: process.env.GMAIL_OAUTH_CLIENT_ID,
    GMAIL_OAUTH_CLIENT_SECRET: process.env.GMAIL_OAUTH_CLIENT_SECRET,
    GMAIL_OAUTH_REFRESH_TOKEN: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
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
    console.error('  GMAIL_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console');
    console.error('  GMAIL_OAUTH_CLIENT_SECRET: OAuth2 client secret');
    console.error('  GMAIL_OAUTH_REFRESH_TOKEN: Refresh token from one-time consent flow');
    console.error('\nRun the setup script to obtain a refresh token:');
    console.error('  npx tsx scripts/oauth-setup.ts <client_id> <client_secret>');
    console.error('\n======================================================\n');
    process.exit(1);
  }

  // Check for partial service account configuration
  const serviceAccountVars = {
    GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL,
    GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY,
    GMAIL_IMPERSONATE_EMAIL: process.env.GMAIL_IMPERSONATE_EMAIL,
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
    console.error('  GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address');
    console.error('  GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)');
    console.error('  GMAIL_IMPERSONATE_EMAIL: Email address to impersonate');
    console.error('\nSetup steps:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a service account with domain-wide delegation');
    console.error('  3. In Google Workspace Admin, grant required Gmail API scopes');
    console.error('  4. Download the JSON key file and extract client_email and private_key');
    console.error('\n======================================================\n');
    process.exit(1);
  }

  // No credentials found at all
  logError('validateEnvironment', 'Missing required environment variables:');

  console.error('\nThis MCP server supports two authentication modes:\n');
  console.error('--- Option 1: OAuth2 (for personal Gmail accounts) ---');
  console.error('  GMAIL_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console');
  console.error('  GMAIL_OAUTH_CLIENT_SECRET: OAuth2 client secret');
  console.error('  GMAIL_OAUTH_REFRESH_TOKEN: Refresh token from one-time consent flow');
  console.error('\n  Setup: Run `npx tsx scripts/oauth-setup.ts <client_id> <client_secret>`');
  console.error('\n--- Option 2: Service Account (for Google Workspace) ---');
  console.error('  GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address');
  console.error('    Example: my-service-account@my-project.iam.gserviceaccount.com');
  console.error('  GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)');
  console.error('    Example: -----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----');
  console.error('  GMAIL_IMPERSONATE_EMAIL: Email address to impersonate');
  console.error('    Example: user@yourdomain.com');
  console.error('\n  Setup steps:');
  console.error('  1. Go to https://console.cloud.google.com/');
  console.error('  2. Create a service account with domain-wide delegation');
  console.error('  3. In Google Workspace Admin, grant required Gmail API scopes');
  console.error('  4. Download the JSON key file and extract client_email and private_key');
  console.error('\nOptional environment variables:');
  console.error('  GMAIL_ENABLED_TOOLGROUPS: Comma-separated list of tool groups to enable');
  console.error('    Valid groups: readonly, readwrite, readwrite_external');
  console.error('    Default: all groups enabled');
  console.error('    Example: GMAIL_ENABLED_TOOLGROUPS=readwrite');
  console.error('\n======================================================\n');

  process.exit(1);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Log tool groups if configured
  if (process.env.GMAIL_ENABLED_TOOLGROUPS) {
    logWarning('config', `Enabled tool groups: ${process.env.GMAIL_ENABLED_TOOLGROUPS}`);
  }

  // Step 3: Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Step 4: Register all handlers (tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Gmail');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
