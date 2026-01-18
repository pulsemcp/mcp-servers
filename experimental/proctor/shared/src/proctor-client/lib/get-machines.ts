import type { MachinesResponse } from '../../types.js';

/**
 * List active Fly.io machines for proctor exams
 */
export async function getMachines(apiKey: string, baseUrl: string): Promise<MachinesResponse> {
  const url = new URL('/api/proctor/machines', baseUrl);

  const response = await fetch(url.toString(), {
    method: 'GET',
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Service error: ${errorData.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to get machines: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as MachinesResponse;
}
