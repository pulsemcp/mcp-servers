import type { Machine, UpdateMachineRequest } from '../../types.js';

/**
 * Update a machine
 */
export async function updateMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string,
  request: UpdateMachineRequest
): Promise<Machine> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines/${machineId}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to update machine: ${response.status} ${response.statusText} - ${error}`
    );
  }

  return (await response.json()) as Machine;
}
