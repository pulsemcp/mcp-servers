import type { Machine } from '../../types.js';

/**
 * Get details for a specific machine
 */
export async function getMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string
): Promise<Machine> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines/${machineId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get machine: ${response.status} ${response.statusText} - ${error}`);
  }

  return (await response.json()) as Machine;
}
