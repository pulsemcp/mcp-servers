import type { DeleteApiKeyResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function deleteApiKey(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<DeleteApiKeyResponse> {
  const url = new URL(`/api/api_keys/${id}`, baseUrl);

  const response = await adminFetch(url.toString(), {
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
      throw new Error('User lacks write privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => ({}))) as { errors?: string[] };
      throw new Error(
        `Cannot delete API key: ${errorData.errors?.join(', ') || 'validation failed'}`
      );
    }
    throw new Error(`Failed to delete API key: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DeleteApiKeyResponse;
}
