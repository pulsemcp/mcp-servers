import type { Redirect, RedirectStatus } from '../../types.js';

interface RailsRedirect {
  id: number;
  from: string;
  to: string;
  status: RedirectStatus;
  created_at?: string;
  updated_at?: string;
}

export async function getRedirect(apiKey: string, baseUrl: string, id: number): Promise<Redirect> {
  const url = new URL(`/api/redirects/${id}`, baseUrl);

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
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 404) {
      throw new Error(`Redirect with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch redirect: ${response.status} ${response.statusText}`);
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
