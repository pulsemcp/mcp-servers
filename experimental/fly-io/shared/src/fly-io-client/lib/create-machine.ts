import type { Machine, CreateMachineRequest } from '../../types.js';

/**
 * Create a new machine
 */
export async function createMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  request: CreateMachineRequest
): Promise<Machine> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines`, {
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
      `Failed to create machine: ${response.status} ${response.statusText} - ${error}`
    );
  }

  return (await response.json()) as Machine;
}
