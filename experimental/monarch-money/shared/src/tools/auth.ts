import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { SessionStore } from '../monarch-client/session-store.js';
import { errorFromException, errorResult, ok, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const CHECK_DESCRIPTION = `Check whether the Monarch Money MCP server has a valid session, and return setup instructions when it does not.

When authenticated, returns:
\`\`\`json
{
  "authenticated": true,
  "email": "you@example.com",
  "id": "user_123",
  "name": "Your Name",
  "sessionPath": "/home/you/.monarch-money-mcp/session.enc",
  "obtainedAt": "2026-01-15T12:34:56.000Z"
}
\`\`\`

When not authenticated, returns a multi-line string explaining the four ways to authenticate the server:

1. **Env-var token (simplest, headless)** — Set \`MONARCH_SESSION_TOKEN=<token>\` in the server's environment. Useful for sandboxed or unattended deployments.
2. **Env-var email + password** — Set \`MONARCH_EMAIL\` and \`MONARCH_PASSWORD\`. The server runs Monarch's REST login at startup. The first time from a new install Monarch sends an email OTP — read the code, set \`MONARCH_EMAIL_OTP=<code>\`, and restart. Set \`MONARCH_TOTP=<code>\` if your account has 2FA enabled.
3. **Login script (interactive)** — Run \`npm run login\` from the server package directory.
4. **Pass an existing token via tool** — Call \`monarch_login_with_token\` with a token you obtained another way.

Once authenticated, the session persists across restarts. The encryption key is derived from \`MONARCH_SESSION_PASSPHRASE\` when set, otherwise from the host + user — making the encrypted file machine-bound by default.

**Use cases:**
- Confirm the server is ready before running other tools
- Diagnose auth errors from other tools
- Discover where the encrypted session file lives on disk
- Get setup instructions for a fresh install`;

const TOKEN_DESCRIPTION = `Save a pre-obtained Monarch Money session token to encrypted on-disk storage.

The token is written to \`~/.monarch-money-mcp/session.enc\` (or \`MONARCH_STATE_DIR/session.enc\` when set), encrypted with AES-256-GCM. Once saved, all other tools will pick it up automatically — no env var configuration needed.

This tool is for users who already have a valid session token. Most users should run the login script (\`npm run login\`) instead, which performs the email/password/TOTP exchange for you.

The tool will validate the token by calling Monarch's \`me\` endpoint before saving. An invalid token returns an error and is not persisted.

**Use cases:**
- Migrate a token captured from a browser session into the server
- Restore access after a session expiry without re-running the login script
- Rotate the on-disk token to a freshly issued one`;

export function authTools(
  clientFactory: ClientFactory,
  sessionStore: SessionStore
): RegisteredTool[] {
  const StatusSchema = z.object({});
  const checkAuthentication: RegisteredTool = {
    name: 'check_authentication',
    description: CHECK_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (args): Promise<ToolResult> => {
      StatusSchema.parse(args ?? {});
      const path = sessionStore.path();
      try {
        const session = await sessionStore.load();
        if (!session || !session.token) {
          return ok(buildSetupInstructions(path));
        }
        const client = await clientFactory();
        const me = await client.whoami();
        return okJSON({
          authenticated: true,
          email: me.email,
          id: me.id,
          name: me.name,
          sessionPath: path,
          obtainedAt: session.obtainedAt,
        });
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const TokenSchema = z.object({
    token: z.string().min(1).describe('Monarch Money session token (a JWT-like string).'),
    email: z
      .string()
      .optional()
      .describe('Optional email address associated with the token, stored alongside it.'),
  });
  const loginWithToken: RegisteredTool = {
    name: 'monarch_login_with_token',
    description: TOKEN_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Monarch Money session token (a JWT-like string).',
        },
        email: {
          type: 'string',
          description: 'Optional email address associated with the token.',
        },
      },
      required: ['token'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = TokenSchema.parse(args ?? {});
        const existing = await sessionStore.load().catch(() => null);
        await sessionStore.save({
          token: parsed.token,
          email: parsed.email ?? existing?.email,
          obtainedAt: new Date().toISOString(),
          deviceUuid: existing?.deviceUuid,
        });
        try {
          const client = await clientFactory();
          const me = await client.whoami();
          return ok(
            `Saved session token to ${sessionStore.path()} and validated against Monarch.\n` +
              `Authenticated as: ${me.email} (id: ${me.id}).`
          );
        } catch (err) {
          // Roll back to the prior session if there was one. We never want to
          // leave a bad token persisted, but we also can't wipe the cached
          // deviceUuid — losing it would re-trigger Monarch's email-OTP gate
          // on the next env-var login from this install.
          if (existing && existing.token) {
            await sessionStore.save(existing);
          } else if (existing?.deviceUuid) {
            await sessionStore.save({
              token: '',
              obtainedAt: new Date().toISOString(),
              email: existing.email,
              deviceUuid: existing.deviceUuid,
            });
          } else {
            await sessionStore.clear();
          }
          return errorResult(
            `Token validation failed; the token was NOT persisted.\n${err instanceof Error ? err.message : String(err)}`
          );
        }
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [checkAuthentication, loginWithToken];
}

function buildSetupInstructions(sessionPath: string): string {
  return (
    `Not authenticated with Monarch Money.\n\n` +
    `Encrypted session path: ${sessionPath}\n\n` +
    `Option 1 — env-var session token (simplest, headless):\n` +
    `  MONARCH_SESSION_TOKEN=<token>   Pasted token; resolved at startup, persisted to disk.\n\n` +
    `Option 2 — env-var email + password (server-side login):\n` +
    `  MONARCH_EMAIL=<email>\n` +
    `  MONARCH_PASSWORD=<password>\n` +
    `  MONARCH_TOTP=<code>             Required if your account has 2FA enabled.\n` +
    `  MONARCH_EMAIL_OTP=<code>        Required on the first login from a new install.\n` +
    `                                  Monarch will email you the code; provide it and restart.\n\n` +
    `Option 3 — interactive CLI:\n` +
    `  cd <server-package> && npm run login\n\n` +
    `Option 4 — pass an existing token via tool:\n` +
    `  Call the 'monarch_login_with_token' tool with token=<your-session-token>.\n\n` +
    `Other environment variables:\n` +
    `  MONARCH_SESSION_PASSPHRASE  Override the encryption passphrase (default: host+user).\n` +
    `  MONARCH_STATE_DIR           Override the storage directory (default: ~/.monarch-money-mcp).\n\n` +
    `After authenticating, call 'check_authentication' again to verify the session.`
  );
}
