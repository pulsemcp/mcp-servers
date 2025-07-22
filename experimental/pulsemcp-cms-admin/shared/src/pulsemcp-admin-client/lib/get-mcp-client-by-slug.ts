import type { MCPClient } from '../../types.js';

export async function getMCPClientBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<MCPClient> {
  const response = await fetch(`${baseUrl}/mcp_clients/${slug}`, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MCP client: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<MCPClient>;
}
