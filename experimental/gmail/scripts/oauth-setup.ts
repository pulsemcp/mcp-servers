#!/usr/bin/env npx tsx
/**
 * One-time OAuth2 setup script for obtaining a Gmail refresh token.
 *
 * Usage:
 *   npx tsx scripts/oauth-setup.ts <client_id> <client_secret>
 *
 * Prerequisites:
 *   1. Create a project in Google Cloud Console (https://console.cloud.google.com/)
 *   2. Enable the Gmail API
 *   3. Configure the OAuth consent screen (External type, then Publish the app)
 *   4. Add yourself as a test user (if still in testing mode)
 *   5. Create OAuth 2.0 credentials (Desktop app type)
 *   6. Copy the Client ID and Client Secret
 *
 * Important: After publishing your OAuth consent screen, create NEW OAuth credentials.
 * Credentials created while in "Testing" mode may retain the 7-day token expiry behavior.
 *
 * This script will:
 *   1. Start a local HTTP server on http://localhost:3000/callback
 *   2. Open your browser to Google's OAuth consent screen
 *   3. Receive the authorization code callback
 *   4. Exchange the code for tokens
 *   5. Print the refresh token for you to use in your configuration
 */

import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
];

async function main() {
  const [clientId, clientSecret] = process.argv.slice(2);

  if (!clientId || !clientSecret) {
    console.error('Usage: npx tsx scripts/oauth-setup.ts <client_id> <client_secret>');
    console.error('');
    console.error('Get your OAuth2 credentials from:');
    console.error('  https://console.cloud.google.com/apis/credentials');
    process.exit(1);
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to ensure refresh token is returned
  });

  console.log('\n=== Gmail OAuth2 Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(`   ${authorizeUrl}\n`);
  console.log('2. Sign in and authorize the application');
  console.log('3. You will be redirected to localhost:3000/callback\n');
  console.log('Waiting for callback...\n');

  const code = await waitForCallback();

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
  console.log(`  GMAIL_OAUTH_CLIENT_ID=${clientId}`);
  console.log(`  GMAIL_OAUTH_CLIENT_SECRET=${clientSecret}`);
  console.log(`  GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('');
  console.log('Example Claude Desktop config:\n');
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          gmail: {
            command: 'npx',
            args: ['gmail-workspace-mcp-server'],
            env: {
              GMAIL_OAUTH_CLIENT_ID: clientId,
              GMAIL_OAUTH_CLIENT_SECRET: clientSecret,
              GMAIL_OAUTH_REFRESH_TOKEN: tokens.refresh_token,
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

function waitForCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://localhost:3000`);
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
      server.close();
      resolve(code);
    });

    server.listen(3000, () => {
      // Server is listening
    });

    server.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        reject(new Error('Port 3000 is already in use. Please free it and try again.'));
      } else {
        reject(err);
      }
    });
  });
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
