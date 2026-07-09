import type {
  Device,
  DevicesResponse,
  DeviceRoutes,
  PolicyFile,
  PolicyValidationResult,
  Key,
  KeysResponse,
  CreateKeyParams,
  CreateOAuthClientParams,
  ApiError,
} from '../types.js';

/**
 * Interface for the Tailscale API client.
 *
 * This allows dependency injection so tests can supply a mock implementation
 * without mocking any internal code — the only boundary that is ever mocked is
 * this client (i.e. the outbound Tailscale HTTP calls it makes).
 */
export interface ITailscaleClient {
  // Policy (ACL) operations
  getPolicyFile(): Promise<PolicyFile>;
  validatePolicyFile(content: string): Promise<PolicyValidationResult>;
  updatePolicyFile(content: string, etag?: string): Promise<PolicyFile>;

  // Device operations
  listDevices(allFields?: boolean): Promise<DevicesResponse>;
  getDevice(deviceId: string, allFields?: boolean): Promise<Device>;
  getDeviceRoutes(deviceId: string): Promise<DeviceRoutes>;
  authorizeDevice(deviceId: string, authorized: boolean): Promise<void>;
  setDeviceTags(deviceId: string, tags: string[]): Promise<void>;
  setDeviceRoutes(deviceId: string, routes: string[]): Promise<DeviceRoutes>;
  deleteDevice(deviceId: string): Promise<void>;

  // Auth-key and OAuth-client operations
  listKeys(all?: boolean): Promise<KeysResponse>;
  getKey(keyId: string): Promise<Key>;
  createAuthKey(params: CreateKeyParams): Promise<Key>;
  createOAuthClient(params: CreateOAuthClientParams): Promise<Key>;
  deleteKey(keyId: string): Promise<void>;
}

const DEFAULT_BASE_URL = 'https://api.tailscale.com/api/v2';
const DEFAULT_TAILNET = '-';

/** Authentication configuration for the Tailscale client. */
export interface TailscaleAuthConfig {
  /** A Tailscale API access token (e.g. `tskey-api-...`). */
  apiKey?: string;
  /** OAuth client ID (used with `oauthClientSecret` for the client-credentials flow). */
  oauthClientId?: string;
  /** OAuth client secret. */
  oauthClientSecret?: string;
}

export interface TailscaleClientOptions extends TailscaleAuthConfig {
  /** Tailnet identifier. Defaults to `-` (the credential's default tailnet). */
  tailnet?: string;
  /** Base URL for the Tailscale API. Defaults to the public API. */
  baseUrl?: string;
}

/**
 * Tailscale API client implementation using `fetch`.
 *
 * Supports two auth schemes:
 * - **API access token** (`apiKey`): sent directly as a Bearer token.
 * - **OAuth client** (`oauthClientId` + `oauthClientSecret`): exchanged for a
 *   short-lived access token via the client-credentials grant, cached until it
 *   is close to expiry, then refreshed.
 */
export class TailscaleClient implements ITailscaleClient {
  private readonly auth: TailscaleAuthConfig;
  private readonly tailnet: string;
  private readonly baseUrl: string;

  // Cached OAuth access token and the epoch-ms time it should be considered expired.
  private cachedToken?: string;
  private tokenExpiresAt = 0;

  constructor(options: TailscaleClientOptions) {
    this.auth = {
      apiKey: options.apiKey,
      oauthClientId: options.oauthClientId,
      oauthClientSecret: options.oauthClientSecret,
    };
    this.tailnet = options.tailnet || DEFAULT_TAILNET;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');

    if (!this.auth.apiKey && !(this.auth.oauthClientId && this.auth.oauthClientSecret)) {
      throw new Error(
        'Tailscale client requires either an API key or an OAuth client ID and secret'
      );
    }
  }

  /** URL-encode the configured tailnet for use in a path segment. */
  private encodedTailnet(): string {
    return encodeURIComponent(this.tailnet);
  }

  /**
   * Resolve the Bearer token to use for a request.
   *
   * For API-key auth this is the key itself. For OAuth auth this performs (and
   * caches) a client-credentials token exchange.
   */
  private async getAccessToken(): Promise<string> {
    if (this.auth.apiKey) {
      return this.auth.apiKey;
    }

    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const body = new URLSearchParams({
      client_id: this.auth.oauthClientId as string,
      client_secret: this.auth.oauthClientSecret as string,
      grant_type: 'client_credentials',
    });

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to obtain OAuth access token: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      throw new Error('OAuth token response did not include an access_token');
    }

    this.cachedToken = data.access_token;
    // Refresh 60s before actual expiry to avoid races; default to 60min if absent.
    const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    this.tokenExpiresAt = now + Math.max(0, expiresInSeconds - 60) * 1000;

    return this.cachedToken;
  }

  /**
   * Perform an authenticated request and return the raw `Response`.
   *
   * Callers that need headers (e.g. the policy-file ETag) or non-JSON bodies use
   * this directly; JSON callers use {@link requestJson}.
   */
  private async fetchRaw(
    path: string,
    init: RequestInit & { accept?: string } = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    const { accept, headers, ...rest } = init;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept || 'application/json',
        ...(headers || {}),
      },
    });

    if (!response.ok) {
      await this.throwForStatus(response);
    }

    return response;
  }

  /** Perform an authenticated request and parse the JSON body. */
  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchRaw(path, init);
    // Some endpoints (e.g. 200 with empty body) return no content.
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  /** Map a non-2xx response to a descriptive Error. */
  private async throwForStatus(response: Response): Promise<never> {
    let detail = '';
    try {
      const text = await response.text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as ApiError;
          detail = parsed.message || text;
        } catch {
          detail = text;
        }
      }
    } catch {
      // Ignore body-read failures; fall back to status text.
    }

    const suffix = detail ? `: ${detail}` : '';

    switch (response.status) {
      case 400:
        throw new Error(`Bad request (400)${suffix}`);
      case 401:
        throw new Error(`Invalid or expired Tailscale credentials (401)${suffix}`);
      case 403:
        throw new Error(`Forbidden — the credential lacks the required scope (403)${suffix}`);
      case 404:
        throw new Error(`Not found (404)${suffix}`);
      case 412:
        throw new Error(
          `Precondition failed — the policy file changed since it was fetched (412)${suffix}`
        );
      case 429:
        throw new Error(`Rate limited by the Tailscale API (429)${suffix}`);
      default:
        throw new Error(`Tailscale API error: ${response.status} ${response.statusText}${suffix}`);
    }
  }

  // ---- Policy (ACL) operations ----

  async getPolicyFile(): Promise<PolicyFile> {
    const response = await this.fetchRaw(`/tailnet/${this.encodedTailnet()}/acl`, {
      method: 'GET',
      accept: 'application/hujson',
    });
    const content = await response.text();
    const etag = response.headers.get('ETag') || undefined;
    return { content, etag };
  }

  async validatePolicyFile(content: string): Promise<PolicyValidationResult> {
    const response = await this.fetchRaw(`/tailnet/${this.encodedTailnet()}/acl/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/hujson' },
      body: content,
    });

    const text = await response.text();
    if (!text || text.trim() === '') {
      return { valid: true };
    }

    // The validate endpoint reports failure by returning a `message` (and often a
    // `data` payload). A valid policy yields an empty body or a message-less object.
    try {
      const parsed = JSON.parse(text) as { message?: string; data?: unknown };
      if (parsed && parsed.message) {
        return { valid: false, message: parsed.message, data: parsed.data };
      }
      return { valid: true };
    } catch {
      // Non-JSON body — surface the raw text as the failure message.
      return { valid: false, message: text };
    }
  }

  async updatePolicyFile(content: string, etag?: string): Promise<PolicyFile> {
    const headers: Record<string, string> = { 'Content-Type': 'application/hujson' };
    if (etag) {
      headers['If-Match'] = etag;
    }

    const response = await this.fetchRaw(`/tailnet/${this.encodedTailnet()}/acl`, {
      method: 'POST',
      headers,
      body: content,
    });

    const responseContent = await response.text();
    const newEtag = response.headers.get('ETag') || undefined;
    return { content: responseContent, etag: newEtag };
  }

  // ---- Device operations ----

  async listDevices(allFields?: boolean): Promise<DevicesResponse> {
    const query = allFields ? '?fields=all' : '';
    return this.requestJson<DevicesResponse>(`/tailnet/${this.encodedTailnet()}/devices${query}`, {
      method: 'GET',
    });
  }

  async getDevice(deviceId: string, allFields?: boolean): Promise<Device> {
    const query = allFields ? '?fields=all' : '';
    return this.requestJson<Device>(`/device/${encodeURIComponent(deviceId)}${query}`, {
      method: 'GET',
    });
  }

  async getDeviceRoutes(deviceId: string): Promise<DeviceRoutes> {
    return this.requestJson<DeviceRoutes>(`/device/${encodeURIComponent(deviceId)}/routes`, {
      method: 'GET',
    });
  }

  async authorizeDevice(deviceId: string, authorized: boolean): Promise<void> {
    await this.fetchRaw(`/device/${encodeURIComponent(deviceId)}/authorized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorized }),
    });
  }

  async setDeviceTags(deviceId: string, tags: string[]): Promise<void> {
    await this.fetchRaw(`/device/${encodeURIComponent(deviceId)}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  }

  async setDeviceRoutes(deviceId: string, routes: string[]): Promise<DeviceRoutes> {
    return this.requestJson<DeviceRoutes>(`/device/${encodeURIComponent(deviceId)}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    });
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.fetchRaw(`/device/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  }

  // ---- Auth-key operations ----

  async listKeys(all?: boolean): Promise<KeysResponse> {
    const query = all ? '?all=true' : '';
    return this.requestJson<KeysResponse>(`/tailnet/${this.encodedTailnet()}/keys${query}`, {
      method: 'GET',
    });
  }

  async getKey(keyId: string): Promise<Key> {
    return this.requestJson<Key>(
      `/tailnet/${this.encodedTailnet()}/keys/${encodeURIComponent(keyId)}`,
      { method: 'GET' }
    );
  }

  async createAuthKey(params: CreateKeyParams): Promise<Key> {
    const capabilities = {
      devices: {
        create: {
          reusable: params.reusable ?? false,
          ephemeral: params.ephemeral ?? false,
          preauthorized: params.preauthorized ?? false,
          tags: params.tags ?? [],
        },
      },
    };

    const body: Record<string, unknown> = { capabilities };
    if (typeof params.expirySeconds === 'number') {
      body.expirySeconds = params.expirySeconds;
    }
    if (params.description) {
      body.description = params.description;
    }

    return this.requestJson<Key>(`/tailnet/${this.encodedTailnet()}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async createOAuthClient(params: CreateOAuthClientParams): Promise<Key> {
    // OAuth clients are created through the unified keys endpoint, distinguished
    // from device auth keys by `keyType: "client"`. The response `Key` carries
    // `id` (the client_id) and `key` (the once-only client_secret).
    const body: Record<string, unknown> = {
      keyType: 'client',
      scopes: params.scopes,
      tags: params.tags ?? [],
    };
    if (params.description) {
      body.description = params.description;
    }

    return this.requestJson<Key>(`/tailnet/${this.encodedTailnet()}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async deleteKey(keyId: string): Promise<void> {
    await this.fetchRaw(`/tailnet/${this.encodedTailnet()}/keys/${encodeURIComponent(keyId)}`, {
      method: 'DELETE',
    });
  }
}
