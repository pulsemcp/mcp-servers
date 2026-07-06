/**
 * Public entry point for the X API client layer: assembles a token provider
 * from environment configuration and returns an `IXClient`.
 */

import { ITokenProvider, RefreshTokenProvider, StaticAccessTokenProvider } from './auth.js';
import { XApiClient } from './x-api-client.js';
import type { IXClient } from '../types.js';

export { RefreshTokenProvider, StaticAccessTokenProvider } from './auth.js';
export type { ITokenProvider, TokenResponse } from './auth.js';
export { XApiClient, X_API_BASE } from './x-api-client.js';
export { XApiError, XAuthError } from './api-errors.js';

export interface XClientEnv {
  X_OAUTH_CLIENT_ID?: string;
  X_OAUTH_CLIENT_SECRET?: string;
  X_OAUTH_REFRESH_TOKEN?: string;
  X_OAUTH_ACCESS_TOKEN?: string;
}

/**
 * Builds an `ITokenProvider` from environment variables.
 *
 * Two supported modes (checked in this order):
 *   1. Refresh-token mode: X_OAUTH_CLIENT_ID + X_OAUTH_CLIENT_SECRET +
 *      X_OAUTH_REFRESH_TOKEN. The provider refreshes access tokens on demand
 *      and rotates the single-use refresh token in memory.
 *   2. Static-access-token mode: X_OAUTH_ACCESS_TOKEN alone. Used when a
 *      central refresher injects a fresh short-lived access token.
 *
 * Throws if neither mode is fully configured.
 */
export function createTokenProviderFromEnv(env: XClientEnv = process.env): ITokenProvider {
  const { X_OAUTH_CLIENT_ID, X_OAUTH_CLIENT_SECRET, X_OAUTH_REFRESH_TOKEN, X_OAUTH_ACCESS_TOKEN } =
    env;

  if (X_OAUTH_CLIENT_ID && X_OAUTH_CLIENT_SECRET && X_OAUTH_REFRESH_TOKEN) {
    return new RefreshTokenProvider({
      clientId: X_OAUTH_CLIENT_ID,
      clientSecret: X_OAUTH_CLIENT_SECRET,
      refreshToken: X_OAUTH_REFRESH_TOKEN,
    });
  }

  if (X_OAUTH_ACCESS_TOKEN) {
    return new StaticAccessTokenProvider(X_OAUTH_ACCESS_TOKEN);
  }

  throw new Error(
    'X OAuth credentials are not configured. Set either ' +
      'X_OAUTH_CLIENT_ID + X_OAUTH_CLIENT_SECRET + X_OAUTH_REFRESH_TOKEN ' +
      '(refresh-token mode) or X_OAUTH_ACCESS_TOKEN (static-token mode).'
  );
}

/** Builds a ready-to-use read-only X client from environment variables. */
export function createXClientFromEnv(env: XClientEnv = process.env): IXClient {
  return new XApiClient({ tokenProvider: createTokenProviderFromEnv(env) });
}
