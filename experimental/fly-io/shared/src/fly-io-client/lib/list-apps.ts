import type { App, ListAppsResponse } from '../../types.js';

/**
 * List all apps for an organization
 */
export async function listApps(
  baseUrl: string,
  headers: Record<string, string>,
  orgSlug?: string
): Promise<App[]> {
  const url = new URL(`${baseUrl}/v1/apps`);
  if (orgSlug) {
    url.searchParams.set('org_slug', orgSlug);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list apps: ${response.status} ${response.statusText} - ${error}`);
  }

  const data = (await response.json()) as ListAppsResponse;
  return data.apps || [];
}
