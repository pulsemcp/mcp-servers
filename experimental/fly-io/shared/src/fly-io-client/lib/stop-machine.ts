/**
 * Stop a running machine
 */
export async function stopMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string
): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}/machines/${machineId}/stop`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to stop machine: ${response.status} ${response.statusText} - ${error}`);
  }
}
