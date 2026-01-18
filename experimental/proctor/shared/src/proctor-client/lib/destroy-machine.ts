/**
 * Delete a Fly.io machine
 */
export async function destroyMachine(
  apiKey: string,
  baseUrl: string,
  machineId: string
): Promise<{ success: boolean }> {
  const url = new URL(`/api/proctor/machines/${encodeURIComponent(machineId)}`, baseUrl);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges or insufficient permissions');
    }
    if (response.status === 400) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Bad request: ${errorData.error || 'Invalid machine ID format'}`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Service error: ${errorData.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to destroy machine: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as { success: boolean };
}
