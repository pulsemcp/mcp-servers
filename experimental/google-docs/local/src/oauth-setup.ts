/**
 * OAuth2 setup flow for obtaining a Google Docs refresh token.
 *
 * This module is invoked as a CLI subcommand:
 *   npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>
 *
 * It starts a local HTTP server, opens the Google OAuth consent flow,
 * and prints the resulting refresh token for use in MCP server configuration.
 */

import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_DOCS_SCOPES } from '../shared/index.js';

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>'
        );
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Missing Code</h1><p>No authorization code received.</p></body></html>'
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body><h1>Authorization Successful!</h1><p>You can close this window and return to the terminal.</p></body></html>'
      );
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    const timeout = setTimeout(() => {
      console.error('\nTimeout: No callback received within 5 minutes. Exiting.');
      server.close();
      reject(new Error('OAuth callback timeout - no response within 5 minutes'));
    }, CALLBACK_TIMEOUT_MS);

    server.listen(port, () => {
      // Server is listening
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Please free it or set PORT env var.`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Run the OAuth2 setup flow.
 * @param args - CLI arguments after "oauth-setup" (i.e., [client_id, client_secret])
 */
export async function runOAuthSetup(args: string[]): Promise<void> {
  const clientId = args[0] || process.env.GOOGLE_DOCS_OAUTH_CLIENT_ID;
  const clientSecret = args[1] || process.env.GOOGLE_DOCS_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      'Usage: npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>'
    );
    console.error('');
    console.error('Or set environment variables:');
    console.error(
      '  GOOGLE_DOCS_OAUTH_CLIENT_ID=... GOOGLE_DOCS_OAUTH_CLIENT_SECRET=... npx google-docs-workspace-mcp-server oauth-setup'
    );
    console.error('');
    console.error('Get your OAuth2 credentials from:');
    console.error('  https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  const redirectUri = `http://localhost:${port}/callback`;
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [...GOOGLE_DOCS_SCOPES],
    prompt: 'consent', // Force consent to ensure refresh token is returned
  });

  console.log('\n=== Google Docs OAuth2 Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(`   ${authorizeUrl}\n`);
  console.log('2. Sign in and authorize the application');
  console.log(`3. You will be redirected to localhost:${port}/callback\n`);
  console.log('Waiting for callback (5 minute timeout)...\n');

  const code = await waitForCallback(port);

  console.log('Authorization code received! Exchanging for tokens...\n');

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error('ERROR: No refresh token received.');
    console.error('');
    console.error('This can happen if:');
    console.error(
      '  - You previously authorized this app (revoke access at https://myaccount.google.com/permissions)'
    );
    console.error('  - The OAuth consent screen is still in "Testing" mode');
    console.error('');
    console.error('Try revoking access and running this script again.');
    process.exit(1);
  }

  console.log('=== Setup Complete ===\n');
  console.log('Add these environment variables to your MCP server configuration:\n');
  console.log(`  GOOGLE_DOCS_OAUTH_CLIENT_ID=${clientId}`);
  console.log(`  GOOGLE_DOCS_OAUTH_CLIENT_SECRET=${clientSecret}`);
  console.log(`  GOOGLE_DOCS_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('');
  console.log('SECURITY NOTE: Keep your refresh token secure. Anyone with this token and your');
  console.log('client credentials can access your Google Docs.\n');
  console.log('Example Claude Desktop config:\n');
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          'google-docs': {
            command: 'npx',
            args: ['google-docs-workspace-mcp-server'],
            env: {
              GOOGLE_DOCS_OAUTH_CLIENT_ID: clientId,
              GOOGLE_DOCS_OAUTH_CLIENT_SECRET: clientSecret,
              GOOGLE_DOCS_OAUTH_REFRESH_TOKEN: tokens.refresh_token,
            },
          },
        },
      },
      null,
      2
    )
  );
  console.log('');

  process.exit(0);
}
