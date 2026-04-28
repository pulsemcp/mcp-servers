import type { DeleteTenantParams, DeleteTenantResponse } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

export async function deleteTenant(
  apiKey: string,
  baseUrl: string,
  params: DeleteTenantParams
): Promise<DeleteTenantResponse> {
  const url = new URL(`/api/tenants/${encodeURIComponent(String(params.id_or_slug))}`, baseUrl);
  if (params.force) {
    url.searchParams.set('force', 'true');
  }

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
    if (response.status === 404) {
      throw new Error(`Tenant ${params.id_or_slug} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json().catch(() => ({}))) as { errors?: string[] };
      throw new Error(
        `Cannot delete tenant: ${errorData.errors?.join(', ') || 'validation failed'}`
      );
    }
    throw new Error(`Failed to delete tenant: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DeleteTenantResponse;
}
