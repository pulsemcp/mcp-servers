export async function deleteMcpJson(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<{ success: boolean; message: string }> {
  const url = new URL(`/api/mcp_jsons/${id}`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
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
      throw new Error(`MCP JSON with ID ${id} not found`);
    }
    throw new Error(`Failed to delete MCP JSON: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success: boolean; message: string };
  return data;
}
