import type { MCPServer } from '../../types.js';

export async function getMCPServerById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<MCPServer | null> {
  // The API doesn't have a direct endpoint to get MCP server by ID,
  // so we need to fetch all servers and find the one with matching ID
  const url = new URL('/supervisor/mcp_servers', baseUrl);

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
    throw new Error(`Failed to fetch MCP servers: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: MCPServer[] };

  // The supervisor endpoint returns data in { data: [...] } format
  if (data.data && Array.isArray(data.data)) {
    const server = data.data.find((s) => s.id === id);
    return server || null;
  }

  return null;
}
