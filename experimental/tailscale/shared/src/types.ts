// TypeScript types for the Tailscale MCP server.
//
// These model the subset of the Tailscale REST API v2 that this server wraps.
// See https://tailscale.com/api for the full API reference.

/** A device (node) in the tailnet. */
export interface Device {
  id: string;
  nodeId?: string;
  name?: string;
  hostname?: string;
  addresses?: string[];
  user?: string;
  os?: string;
  clientVersion?: string;
  updateAvailable?: boolean;
  created?: string;
  lastSeen?: string;
  keyExpiryDisabled?: boolean;
  expires?: string;
  authorized?: boolean;
  isExternal?: boolean;
  machineKey?: string;
  nodeKey?: string;
  tags?: string[];
  tailnetLockError?: string;
  tailnetLockKey?: string;
  // Additional fields returned when `fields=all` is requested.
  [key: string]: unknown;
}

/** Response body for GET /tailnet/{tailnet}/devices. */
export interface DevicesResponse {
  devices: Device[];
}

/** Response body for GET /device/{deviceId}/routes. */
export interface DeviceRoutes {
  advertisedRoutes: string[];
  enabledRoutes: string[];
}

/**
 * A tailnet policy (ACL) file, returned by GET /tailnet/{tailnet}/acl.
 *
 * `content` is the raw HuJSON (or JSON) policy document. `etag` is the value of
 * the response `ETag` header, used for optimistic concurrency on updates via the
 * `If-Match` request header.
 */
export interface PolicyFile {
  content: string;
  etag?: string;
}

/** Result of POST /tailnet/{tailnet}/acl/validate. */
export interface PolicyValidationResult {
  valid: boolean;
  /** Present when validation fails. */
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/** Capabilities envelope for creating an auth key. */
export interface KeyCapabilities {
  devices?: {
    create?: {
      reusable?: boolean;
      ephemeral?: boolean;
      preauthorized?: boolean;
      tags?: string[];
    };
  };
}

/**
 * An auth key, OAuth client, or federated identity, as returned by the keys
 * endpoints. All three credential types live under `/tailnet/{tailnet}/keys` and
 * are distinguished by `keyType`.
 */
export interface Key {
  id: string;
  /**
   * The secret key material. Only present in the response to a create request.
   * For an OAuth client this is the `client_secret` (paired with `id` as the
   * `client_id`).
   */
  key?: string;
  /** The credential type: `auth` (device auth key), `client` (OAuth client), or `federated`. */
  keyType?: string;
  created?: string;
  updated?: string;
  expires?: string;
  revoked?: string;
  capabilities?: KeyCapabilities;
  /** OAuth/federated-identity scopes granted to the credential. */
  scopes?: string[];
  /** ACL tags associated with the credential. */
  tags?: string[];
  /** ID of the user who created the credential (empty for credentials created by other trust credentials). */
  userId?: string;
  description?: string;
  [key: string]: unknown;
}

/** Response body for GET /tailnet/{tailnet}/keys. */
export interface KeysResponse {
  keys: Key[];
}

/** Parameters for creating a new auth key. */
export interface CreateKeyParams {
  reusable?: boolean;
  ephemeral?: boolean;
  preauthorized?: boolean;
  tags?: string[];
  expirySeconds?: number;
  description?: string;
}

/**
 * Parameters for creating a new OAuth client.
 *
 * Unlike a device auth key (which enrolls devices), an OAuth client is a
 * non-interactive credential (`client_id` + `client_secret`) that can be
 * exchanged for short-lived access tokens to call the Tailscale API — including
 * `devices`-write endpoints that auth keys cannot reach.
 */
export interface CreateOAuthClientParams {
  /**
   * Scopes to grant to the client (e.g. `devices:core`, `devices:core:read`,
   * `all:read`). At least one scope is required. See
   * https://tailscale.com/kb/1623/ for the full scope vocabulary.
   */
  scopes: string[];
  /**
   * ACL tags the client's access tokens may assign to devices. Mandatory when
   * `scopes` includes `devices:core` or `auth_keys`.
   */
  tags?: string[];
  /** A short human-readable description (alphanumeric, spaces, hyphens; max 50 chars). */
  description?: string;
}

/** Shape of an error payload the Tailscale API may return. */
export interface ApiError {
  message?: string;
  [key: string]: unknown;
}
