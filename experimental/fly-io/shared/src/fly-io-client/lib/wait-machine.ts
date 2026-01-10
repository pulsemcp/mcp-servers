import type { MachineState } from '../../types.js';

/**
 * Wait for a machine to reach a specific state
 */
export async function waitMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string,
  state: MachineState,
  timeout?: number
): Promise<void> {
  const params = new URLSearchParams({ state });
  if (timeout !== undefined) {
    params.set('timeout', timeout.toString());
  }

  const response = await fetch(
    `${baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/wait?${params.toString()}`,
    {
      method: 'GET',
      headers,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to wait for machine state: ${response.status} ${text}`);
  }
}
