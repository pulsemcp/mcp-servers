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

/** An auth key or API access token, as returned by the keys endpoints. */
export interface Key {
  id: string;
  /** Only present in the response to a create request. */
  key?: string;
  created?: string;
  expires?: string;
  revoked?: string;
  capabilities?: KeyCapabilities;
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

/** Shape of an error payload the Tailscale API may return. */
export interface ApiError {
  message?: string;
  [key: string]: unknown;
}
