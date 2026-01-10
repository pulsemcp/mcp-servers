import type { App } from '../../types.js';

/**
 * Get details for a specific app
 */
export async function getApp(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string
): Promise<App> {
  const response = await fetch(`${baseUrl}/v1/apps/${appName}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get app: ${response.status} ${response.statusText} - ${error}`);
  }

  return (await response.json()) as App;
}
