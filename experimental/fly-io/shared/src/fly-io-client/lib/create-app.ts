import type { App, CreateAppRequest } from '../../types.js';

/**
 * Create a new app
 */
export async function createApp(
  baseUrl: string,
  headers: Record<string, string>,
  request: CreateAppRequest
): Promise<App> {
  const response = await fetch(`${baseUrl}/v1/apps`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create app: ${response.status} ${response.statusText} - ${error}`);
  }

  return (await response.json()) as App;
}
