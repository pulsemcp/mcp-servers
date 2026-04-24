import type { RecacheMCPServerResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function recacheMCPServer(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<RecacheMCPServerResponse> {
  const url = new URL(`/api/mcp_servers/${encodeURIComponent(slug)}/recache`, baseUrl);

  const response = await adminFetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`MCP server not found: ${slug}`);
    }
    throw new Error(`Failed to recache MCP server: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as RecacheMCPServerResponse;
}
