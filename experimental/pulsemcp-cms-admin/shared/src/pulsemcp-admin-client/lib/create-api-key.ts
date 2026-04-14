import type { ApiKey, CreateApiKeyParams } from '../../types.js';

interface RailsApiKey {
  id: number;
  name?: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_is_admin: boolean;
  permission_level: string;
  key: string;
  created_at: string;
}

export async function createApiKey(
  apiKey: string,
  baseUrl: string,
  params: CreateApiKeyParams
): Promise<ApiKey> {
  const url = new URL('/api/api_keys', baseUrl);

  const body: Record<string, unknown> = {
    tenant_slug: params.tenant_slug,
  };

  if (params.name !== undefined) {
    body.name = params.name;
  }
  if (params.permission_level !== undefined) {
    body.permission_level = params.permission_level;
  }

  const response = await fetch(url.toString(), {
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
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error || 'Tenant not found');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string; errors?: string[] };
      const message = errorData.errors?.join(', ') || errorData.error || 'Unknown error';
      throw new Error(`Validation failed: ${message}`);
    }
    throw new Error(`Failed to create API key: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as RailsApiKey;

  return {
    id: result.id,
    name: result.name,
    tenant_id: result.tenant_id,
    tenant_slug: result.tenant_slug,
    tenant_is_admin: result.tenant_is_admin,
    permission_level: result.permission_level as ApiKey['permission_level'],
    key: result.key,
    created_at: result.created_at,
  };
}
