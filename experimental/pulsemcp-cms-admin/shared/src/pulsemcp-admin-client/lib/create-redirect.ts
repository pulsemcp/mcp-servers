import type { Redirect, CreateRedirectParams, RedirectStatus } from '../../types.js';

interface RailsRedirect {
  id: number;
  from: string;
  to: string;
  status: RedirectStatus;
  created_at?: string;
  updated_at?: string;
}

export async function createRedirect(
  apiKey: string,
  baseUrl: string,
  params: CreateRedirectParams
): Promise<Redirect> {
  const url = new URL('/api/redirects', baseUrl);

  const body: Record<string, unknown> = {
    from: params.from,
    to: params.to,
  };

  if (params.status !== undefined) {
    body.status = params.status;
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
    if (response.status === 422) {
      const errorData = (await response.json()) as { errors?: string[] };
      throw new Error(`Validation failed: ${errorData.errors?.join(', ') || 'Unknown error'}`);
    }
    throw new Error(`Failed to create redirect: ${response.status} ${response.statusText}`);
  }

  const redirect = (await response.json()) as RailsRedirect;

  return {
    id: redirect.id,
    from: redirect.from,
    to: redirect.to,
    status: redirect.status,
    created_at: redirect.created_at,
    updated_at: redirect.updated_at,
  };
}
