import type {
  BulkUpdateTenantServersParams,
  BulkUpdateTenantServersResponse,
} from '../../types.js';
import { adminFetch } from './admin-fetch.js';

interface RailsErrorResponse {
  status?: 'error';
  error_code?: string;
  message?: string;
  unresolved_identifiers?: Array<number | string>;
}

export async function bulkUpdateTenantServers(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string,
  params: BulkUpdateTenantServersParams
): Promise<BulkUpdateTenantServersResponse> {
  const url = new URL(`/api/tenants/${idOrSlug}/servers/bulk_update`, baseUrl);

  const body: Record<string, unknown> = {};
  if (params.add_server_identifiers && params.add_server_identifiers.length > 0) {
    body.add_server_identifiers = params.add_server_identifiers;
  }
  if (params.remove_server_identifiers && params.remove_server_identifiers.length > 0) {
    body.remove_server_identifiers = params.remove_server_identifiers;
  }
  if (params.restore_association_ids && params.restore_association_ids.length > 0) {
    body.restore_association_ids = params.restore_association_ids;
  }

  const response = await adminFetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks write privileges');
    }
    if (response.status === 404) {
      throw new Error(`Tenant with ID/slug ${idOrSlug} not found`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as RailsErrorResponse;
      const detail = errorData.message || errorData.error_code || 'Unknown error';
      throw new Error(`Bulk update failed: ${detail}`);
    }
    throw new Error(
      `Failed to bulk-update tenant servers: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as BulkUpdateTenantServersResponse;
}
