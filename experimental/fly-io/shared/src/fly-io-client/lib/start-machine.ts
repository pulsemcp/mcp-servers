/**
 * Start a stopped machine
 */
export async function startMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string
): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines/${machineId}/start`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to start machine: ${response.status} ${response.statusText} - ${error}`
    );
  }
}
