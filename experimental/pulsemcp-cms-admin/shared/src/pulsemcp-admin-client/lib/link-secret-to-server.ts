import type { LinkSecretToServerParams, SecretWithLink } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

/**
 * Link an MCP server to a secret by writing the mcp_servers_secrets join row.
 * This join is what Proctor reads to inject the secret value at runtime, so it
 * is the operation that actually scopes a stored secret to a server.
 *
 * Idempotent on the backend: relinking an already-linked server returns the
 * existing join (updating onepassword_tag when a new value is supplied) instead
 * of erroring or duplicating.
 */
export async function linkSecretToServer(
  apiKey: string,
  baseUrl: string,
  params: LinkSecretToServerParams
): Promise<SecretWithLink> {
  const url = new URL(`/api/secrets/${encodeURIComponent(String(params.secret))}/servers`, baseUrl);

  const body: Record<string, unknown> = {};
  if (params.mcp_server_id !== undefined) {
    body.mcp_server_id = params.mcp_server_id;
  }
  if (params.mcp_server_slug !== undefined) {
    body.mcp_server_slug = params.mcp_server_slug;
  }
  if (params.onepassword_tag !== undefined) {
    body.onepassword_tag = params.onepassword_tag;
  }

  const response = await adminFetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || 'Secret or MCP server not found');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to link secret to server: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SecretWithLink;
}
