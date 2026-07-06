/**
 * OAuth 2.0 token providers for the X (Twitter) API.
 *
 * X uses OAuth 2.0 Authorization Code with PKCE for user-context access. Two
 * facts about X's tokens shape this module:
 *
 *   1. Access tokens are short-lived (~2 hours).
 *   2. Refresh tokens are SINGLE-USE and ROTATING. Every call to the token
 *      endpoint with `grant_type=refresh_token` returns a BRAND-NEW refresh
 *      token and invalidates the one you just used. (This is unlike Google,
 *      whose refresh tokens are stable.)
 *
 * Consequence: the rotated refresh token must be retained. This process holds
 * it IN MEMORY and rotates it on each refresh for the lifetime of the process.
 * A long-lived deployment that refreshes the token centrally (e.g. the PulseMCP
 * admin API, mirroring the Zoom/Slack pattern) can instead inject a fresh
 * access token directly via `X_OAUTH_ACCESS_TOKEN` — see StaticAccessTokenProvider.
 */

import { XAuthError } from './api-errors.js';

export const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';

/** Refresh this many milliseconds before the token actually expires. */
const EXPIRY_BUFFER_MS = 60_000;

/**
 * Fallback access-token lifetime (seconds) when the token endpoint omits or
 * returns a non-numeric `expires_in`. X documents ~2h lifetimes and always
 * sends the field, but without a guard a missing value makes the expiry NaN,
 * so the cache check never passes and every request refreshes — churning the
 * single-use refresh token.
 */
const DEFAULT_TOKEN_TTL_SECONDS = 7_200;

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface ITokenProvider {
  /** Returns a valid bearer access token, refreshing if necessary. */
  getAccessToken(): Promise<string>;
  /**
   * Marks the current cached access token as invalid so the next
   * getAccessToken() forces a refresh. Called after a 401 from the API.
   */
  invalidate(): void;
}

/**
 * Base class providing access-token caching with a refresh mutex and an
 * expiry buffer. Subclasses implement `fetchToken()`.
 */
abstract class BaseTokenProvider implements ITokenProvider {
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry - EXPIRY_BUFFER_MS) {
      return this.cachedToken;
    }

    // Collapse concurrent refreshes into a single in-flight request.
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  invalidate(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  private async doRefresh(): Promise<string> {
    const { access_token, expires_in } = await this.fetchToken();
    this.cachedToken = access_token;
    const ttlSeconds =
      typeof expires_in === 'number' && Number.isFinite(expires_in) && expires_in > 0
        ? expires_in
        : DEFAULT_TOKEN_TTL_SECONDS;
    this.tokenExpiry = Date.now() + ttlSeconds * 1000;
    return access_token;
  }

  /** Obtain a fresh access token from the auth source. */
  protected abstract fetchToken(): Promise<TokenResponse>;
}

export interface RefreshTokenProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  tokenUrl?: string;
}

/**
 * Token provider backed by a stored OAuth refresh token. Performs the
 * `grant_type=refresh_token` exchange with HTTP Basic auth (confidential
 * client) and rotates the in-memory refresh token on every refresh.
 */
export class RefreshTokenProvider extends BaseTokenProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private currentRefreshToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenUrl: string;

  constructor(config: RefreshTokenProviderConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.currentRefreshToken = config.refreshToken;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.tokenUrl = config.tokenUrl ?? X_TOKEN_URL;
  }

  /**
   * The current (possibly rotated) refresh token. Exposed so an operator flow
   * can persist the latest value — X invalidates the previous one on each use.
   */
  get refreshToken(): string {
    return this.currentRefreshToken;
  }

  protected async fetchToken(): Promise<TokenResponse> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.currentRefreshToken,
      client_id: this.clientId,
    });

    const response = await this.fetchImpl(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: body.toString(),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new XAuthError(
        `Failed to refresh X access token (HTTP ${response.status})`,
        response.status,
        text
      );
    }

    let parsed: TokenResponse;
    try {
      parsed = JSON.parse(text) as TokenResponse;
    } catch {
      throw new XAuthError('X token endpoint returned non-JSON response');
    }

    if (!parsed.access_token) {
      throw new XAuthError('X token endpoint response missing access_token');
    }

    // X rotates the refresh token on every refresh — retain the new one so the
    // next refresh (or a persistence hook) uses the valid token.
    if (parsed.refresh_token) {
      this.currentRefreshToken = parsed.refresh_token;
    }

    return parsed;
  }
}

/**
 * Token provider for deployments where a fresh access token is injected
 * directly (e.g. a central refresher hands out short-lived access tokens).
 * There is no refresh capability — when the token expires the process must be
 * restarted with a new one. Mirrors the repo's Zoom/Slack OAuth pattern.
 */
export class StaticAccessTokenProvider implements ITokenProvider {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }

  invalidate(): void {
    // No-op: a static token cannot be refreshed. A subsequent request will
    // fail with 401 and surface a clear auth error to the caller.
  }
}
