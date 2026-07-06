/**
 * One-time OAuth 2.0 (Authorization Code + PKCE) setup flow for minting an X
 * refresh token.
 *
 * Invoked as a CLI subcommand:
 *   npx pulsemcp-x-twitter-mcp-server oauth-setup <client_id> <client_secret>
 *
 * It starts a local HTTP server on the loopback redirect, prints the X consent
 * URL, waits for the redirect, and exchanges the authorization code for tokens.
 * The resulting refresh token is printed for use in the MCP server config.
 *
 * SAFETY: the requested scopes are `tweet.read users.read bookmark.read
 * bookmark.write offline.access`. The only write scope is `bookmark.write`,
 * which grants access solely to the user's PRIVATE bookmarks. No scope that
 * permits a PUBLIC action (posting, liking, following, DMing, etc.) is ever
 * requested.
 */

import http from 'node:http';
import crypto from 'node:crypto';

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';

/**
 * Requested scopes. `bookmark.write` (private bookmarks only) is the sole write
 * scope; offline.access is required to receive a refresh token.
 */
const SCOPES = ['tweet.read', 'users.read', 'bookmark.read', 'bookmark.write', 'offline.access'];

function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generates a PKCE code_verifier and its S256 code_challenge. */
function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function waitForCallback(port: number, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization failed</h1><p>You can close this window.</p></body></html>'
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>State mismatch</h1><p>Possible CSRF. You can close this window.</p></body></html>'
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error('OAuth state mismatch — aborting for safety.'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Missing code</h1><p>No authorization code received.</p></body></html>'
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error('OAuth callback did not include an authorization code.'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body><h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p></body></html>'
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

    server.listen(port, '127.0.0.1');
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

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

async function exchangeCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<TokenResponse> {
  const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.verifier,
    client_id: params.clientId,
  });

  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token exchange failed (HTTP ${response.status}): ${text}`);
  }
  return JSON.parse(text) as TokenResponse;
}

/**
 * Run the OAuth setup flow.
 * @param args - CLI arguments after "oauth-setup" (i.e., [client_id, client_secret])
 */
export async function runOAuthSetup(args: string[]): Promise<void> {
  const clientId = args[0] || process.env.X_OAUTH_CLIENT_ID;
  const clientSecret = args[1] || process.env.X_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      'Usage: npx pulsemcp-x-twitter-mcp-server oauth-setup <client_id> <client_secret>'
    );
    console.error('');
    console.error('Or set environment variables:');
    console.error(
      '  X_OAUTH_CLIENT_ID=... X_OAUTH_CLIENT_SECRET=... npx pulsemcp-x-twitter-mcp-server oauth-setup'
    );
    console.error('');
    console.error('Get your OAuth 2.0 credentials from the X developer portal:');
    console.error('  https://developer.x.com/en/portal/dashboard');
    console.error('');
    console.error('The app must have this redirect URI registered:');
    console.error(`  http://localhost:${process.env.PORT || '3000'}/callback`);
    process.exit(1);
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  const redirectUri = `http://localhost:${port}/callback`;
  const { verifier, challenge } = generatePkce();
  const state = base64url(crypto.randomBytes(16));

  const authorizeUrl = new URL(X_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', SCOPES.join(' '));
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  console.log('\n=== X (Twitter) OAuth 2.0 Setup (read + private-bookmark-write scopes) ===\n');
  console.log(`Scopes requested: ${SCOPES.join(' ')}\n`);
  console.log('1. Ensure this redirect URI is registered on your X app:');
  console.log(`     ${redirectUri}\n`);
  console.log('2. Open this URL in your browser:\n');
  console.log(`   ${authorizeUrl.toString()}\n`);
  console.log('3. Sign in and authorize the application');
  console.log(`4. You will be redirected to ${redirectUri}\n`);
  console.log('Waiting for callback (5 minute timeout)...\n');

  const code = await waitForCallback(port, state);
  console.log('Authorization code received! Exchanging for tokens...\n');

  const tokens = await exchangeCode({ clientId, clientSecret, code, redirectUri, verifier });

  if (!tokens.refresh_token) {
    console.error(
      'ERROR: No refresh token received. Ensure "offline.access" is among the granted scopes.'
    );
    process.exit(1);
  }

  console.log('=== Setup complete ===\n');
  console.log('Add these environment variables to your MCP server configuration:\n');
  console.log(`  X_OAUTH_CLIENT_ID=${clientId}`);
  console.log('  X_OAUTH_CLIENT_SECRET=<the client secret you supplied>');
  console.log(`  X_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('');
  console.log('IMPORTANT: X refresh tokens are SINGLE-USE and rotate on every refresh.');
  console.log('This server keeps the rotated token in memory for its lifetime. If the');
  console.log('process restarts, it reuses the token above — which is valid until its');
  console.log('first refresh in a NEW process. For long-lived deployments, refresh the');
  console.log('token centrally and inject X_OAUTH_ACCESS_TOKEN instead (see the README).');
  console.log('');
  console.log('SECURITY NOTE: Keep these secrets safe. Anyone with the refresh token and');
  console.log('client credentials can read this X account and modify its private bookmarks.\n');

  process.exit(0);
}
