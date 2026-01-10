/**
 * Delete a machine
 */
export async function deleteMachine(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  machineId: string,
  force: boolean = false
): Promise<void> {
  const url = new URL(`${baseUrl}/v1/apps/${appName}/machines/${machineId}`);
  if (force) {
    url.searchParams.set('force', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to delete machine: ${response.status} ${response.statusText} - ${error}`
    );
  }
}
