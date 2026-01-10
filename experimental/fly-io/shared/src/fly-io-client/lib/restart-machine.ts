/**
 * Restart a machine (stop then start)
 */
export async function restartMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string
): Promise<void> {
  // First stop the machine
  const stopResponse = await fetch(
    `${baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/stop`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!stopResponse.ok) {
    const text = await stopResponse.text();
    throw new Error(`Failed to stop machine for restart: ${stopResponse.status} ${text}`);
  }

  // Wait a moment for the machine to fully stop
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Then start the machine
  const startResponse = await fetch(
    `${baseUrl}/v1/apps/${encodeURIComponent(appName)}/machines/${encodeURIComponent(machineId)}/start`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!startResponse.ok) {
    const text = await startResponse.text();
    throw new Error(`Failed to start machine after stop: ${startResponse.status} ${text}`);
  }
}
