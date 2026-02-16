#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, defaultClientFactory } from '../shared/index.js';
import { setRefreshToken, setAuthenticated } from '../shared/state.js';
import { refreshCognitoTokens } from '../shared/pointsyeah-client/lib/auth.js';
import { logServerStart, logError, logWarning, logDebug } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// STARTUP TOKEN VALIDATION
// =============================================================================

/**
 * If POINTSYEAH_REFRESH_TOKEN is set, validate it and seed auth state.
 * If not set or invalid, the server starts in "needs token" mode with
 * only the set_refresh_token tool available.
 */
async function initializeAuth(): Promise<void> {
  const envToken = process.env.POINTSYEAH_REFRESH_TOKEN;

  if (!envToken) {
    logWarning(
      'config',
      'POINTSYEAH_REFRESH_TOKEN not set. Server starting in authentication mode — ' +
        'only set_refresh_token tool will be available.'
    );
    return;
  }

  try {
    logDebug('auth', 'Validating refresh token from environment...');
    await refreshCognitoTokens(envToken);
    setRefreshToken(envToken);
    setAuthenticated(true);
    logDebug('auth', 'Refresh token validated successfully');
  } catch (error) {
    logWarning(
      'auth',
      `Refresh token from environment is invalid: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Server starting in authentication mode — use set_refresh_token tool to provide a valid token.'
    );
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  await initializeAuth();

  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.ENABLED_TOOLGROUPS}`);
  }

  const clientFactory = defaultClientFactory;

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
