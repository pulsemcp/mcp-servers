import type { MCPClient } from '../../types.js';

export async function getMCPClientBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<MCPClient> {
  // Use the supervisor endpoint which supports JSON
  const url = new URL(`/supervisor/mcp_clients/${slug}`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
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
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 404) {
      throw new Error(`MCP client not found: ${slug}`);
    }
    throw new Error(`Failed to fetch MCP client: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // The supervisor endpoint returns the MCP client object directly
  return data as MCPClient;
}
