import type { MCPServer } from '../../types.js';

export async function getMCPServerBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<MCPServer> {
  const response = await fetch(`${baseUrl}/mcp_servers/${slug}`, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch MCP server: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<MCPServer>;
}
