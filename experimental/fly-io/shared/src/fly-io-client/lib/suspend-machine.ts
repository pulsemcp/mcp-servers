/**
 * Suspend a machine (saves state to disk)
 */
export async function suspendMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string
): Promise<void> {
  const response = await fetch(
    `${baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/suspend`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to suspend machine: ${response.status} ${text}`);
  }
}
