import type { Machine } from '../../types.js';

/**
 * List all machines for an app
 */
export async function listMachines(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string
): Promise<Machine[]> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to list machines: ${response.status} ${response.statusText} - ${error}`
    );
  }

  return (await response.json()) as Machine[];
}
