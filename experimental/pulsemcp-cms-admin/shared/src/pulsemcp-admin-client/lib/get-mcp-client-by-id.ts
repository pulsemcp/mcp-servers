import type { MCPClient } from '../../types.js';

export async function getMCPClientById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<MCPClient | null> {
  // The API doesn't have a direct endpoint to get MCP client by ID,
  // so we need to fetch all clients and find the one with matching ID
  const url = new URL('/supervisor/mcp_clients', baseUrl);

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
    throw new Error(`Failed to fetch MCP clients: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: MCPClient[] };

  // The supervisor endpoint returns data in { data: [...] } format
  if (data.data && Array.isArray(data.data)) {
    const client = data.data.find((c) => c.id === id);
    return client || null;
  }

  return null;
}
