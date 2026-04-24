// The admin API origin (admin.pulsemcp.com) sits behind Cloudflare, which
// applies rate limits (100 GET/min/IP → Managed Challenge) and Super Bot
// Fight Mode to all traffic. Internal clients (this MCP server, the discovery
// pipeline, etc.) can trip those rules and see spurious 403s even when their
// X-API-Key is valid. A Cloudflare custom rule skips the WAF stack when the
// X-PulseMCP-Internal header carries a shared secret.
//
// This helper wraps fetch() and injects that header from the env var
// PULSEMCP_ADMIN_INTERNAL_SECRET when set. When unset, requests still work
// but are subject to the full WAF treatment — fine for local dev, tests, and
// staging (admin.staging.pulsemcp.com is grey-clouded, so Cloudflare is not
// in the path). See pulsemcp/pulsemcp#2882 for context.

const INTERNAL_HEADER = 'X-PulseMCP-Internal';
const INTERNAL_SECRET_ENV_VAR = 'PULSEMCP_ADMIN_INTERNAL_SECRET';

export interface AdminFetchDeps {
  fetchFn?: typeof fetch;
  getInternalSecret?: () => string | undefined;
}

function defaultGetInternalSecret(): string | undefined {
  const value = process.env[INTERNAL_SECRET_ENV_VAR];
  return value && value.length > 0 ? value : undefined;
}

// `input` is intentionally narrowed to `string | URL` rather than the broader
// `RequestInfo`. A `Request`'s body is a single-use `ReadableStream`, and
// narrowing keeps semantics predictable if a retry wrapper is ever layered
// on top. All call sites in this client lib pass URL strings.
export async function adminFetch(
  input: string | URL,
  init?: RequestInit,
  deps: AdminFetchDeps = {}
): Promise<Response> {
  const fetchFn = deps.fetchFn ?? fetch;
  const getSecret = deps.getInternalSecret ?? defaultGetInternalSecret;
  const secret = getSecret();

  if (!secret) {
    return fetchFn(input, init);
  }

  const headers = new Headers(init?.headers);
  headers.set(INTERNAL_HEADER, secret);
  return fetchFn(input, { ...init, headers });
}
