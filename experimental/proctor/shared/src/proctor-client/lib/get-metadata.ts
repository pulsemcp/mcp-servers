import type { ProctorMetadataResponse } from '../../types.js';

/**
 * Get available runtimes and exams from the Proctor API
 */
export async function getMetadata(
  apiKey: string,
  baseUrl: string
): Promise<ProctorMetadataResponse> {
  const url = new URL('/api/proctor/metadata', baseUrl);

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
    throw new Error(`Failed to get metadata: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ProctorMetadataResponse;
}
