import type { Secret, CreateSecretParams } from '../../types.js';
import { adminFetch } from './admin-fetch.js';

/**
 * Create a secret. The secret's value stays in 1Password — this only records
 * the `onepassword_item_id` reference plus metadata.
 */
export async function createSecret(
  apiKey: string,
  baseUrl: string,
  params: CreateSecretParams
): Promise<Secret> {
  const url = new URL('/api/secrets', baseUrl);

  const body: Record<string, unknown> = {
    slug: params.slug,
    onepassword_item_id: params.onepassword_item_id,
  };
  if (params.title !== undefined) {
    body.title = params.title;
  }
  if (params.description !== undefined) {
    body.description = params.description;
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to create secret: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Secret;
}
