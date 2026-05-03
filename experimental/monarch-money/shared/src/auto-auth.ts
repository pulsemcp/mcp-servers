/**
 * Resolves a Monarch session at MCP-server startup from environment variables
 * (and/or the cached encrypted session file).
 *
 * Priority order:
 *   1. `MONARCH_SESSION_TOKEN` — paste-a-token mode. The simplest path for
 *      headless deployments: obtain a token once (via the login script or a
 *      browser session), set it in the env, and forget it.
 *   2. Cached session on disk — preserves a previously-acquired token across
 *      runs.
 *   3. `MONARCH_EMAIL` + `MONARCH_PASSWORD` — full credentials. Performs the
 *      REST `/auth/login/` exchange. First-time logins from a new install hit
 *      Monarch's email-OTP gate; the user must read the code from email and
 *      provide it via `MONARCH_EMAIL_OTP` on the next run. Once paired, the
 *      persisted `device-uuid` keeps subsequent password logins OTP-free.
 *
 * This function returns `null` (rather than throwing) when no auth could be
 * resolved without errors — the server boots either way so the in-protocol
 * auth tools (`setup_authentication`, `monarch_login_with_token`,
 * `check_auth_status`) can guide the user. When `MONARCH_EMAIL` +
 * `MONARCH_PASSWORD` are set but login itself fails, the underlying typed
 * error (`MonarchEmailOtpRequiredError`, etc.) is rethrown so the caller can
 * surface a clear stderr message.
 */
import { generateDeviceUuid, login, type LoginTransportOptions } from './monarch-client/auth.js';
import type { SessionStore } from './monarch-client/session-store.js';
import type { SessionState } from './types.js';

export interface AutoAuthOptions {
  sessionStore: SessionStore;
  /** Override env access (used by tests). */
  env?: NodeJS.ProcessEnv;
  /** Override fetch (used by tests). */
  fetchImpl?: typeof fetch;
  /** Override the login endpoint (used by tests). */
  loginEndpoint?: string;
  /** Override the device-uuid generator (used by tests for determinism). */
  generateDeviceUuid?: () => string;
}

export async function resolveSession(opts: AutoAuthOptions): Promise<SessionState | null> {
  const env = opts.env ?? process.env;
  const existing = await opts.sessionStore.load();

  const envToken = trimOrUndefined(env.MONARCH_SESSION_TOKEN);
  if (envToken) {
    if (existing && existing.token === envToken) return existing;
    const next: SessionState = {
      token: envToken,
      obtainedAt: new Date().toISOString(),
      email: existing?.email ?? trimOrUndefined(env.MONARCH_EMAIL),
      deviceUuid: existing?.deviceUuid,
    };
    await opts.sessionStore.save(next);
    return next;
  }

  if (existing && existing.token) return existing;

  const email = trimOrUndefined(env.MONARCH_EMAIL);
  const password = env.MONARCH_PASSWORD;
  if (email && password) {
    const deviceUuid = existing?.deviceUuid ?? (opts.generateDeviceUuid ?? generateDeviceUuid)();

    const transportOpts: LoginTransportOptions = {};
    if (opts.fetchImpl) transportOpts.fetchImpl = opts.fetchImpl;
    if (opts.loginEndpoint) transportOpts.endpoint = opts.loginEndpoint;

    const result = await login(
      {
        email,
        password,
        totp: trimOrUndefined(env.MONARCH_TOTP),
        emailOtp: trimOrUndefined(env.MONARCH_EMAIL_OTP),
        deviceUuid,
      },
      transportOpts
    );

    const next: SessionState = {
      token: result.token,
      obtainedAt: new Date().toISOString(),
      email: result.user?.email ?? email,
      deviceUuid,
    };
    await opts.sessionStore.save(next);
    return next;
  }

  return null;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
