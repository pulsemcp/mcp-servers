import type { MCPImplementation } from '../../types.js';

export async function getMCPImplementationById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<MCPImplementation | null> {
  const url = new URL(`/api/implementations/${id}`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    throw new Error(
      `Failed to fetch MCP implementation: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MCPImplementation;
  return data;
}
