/**
 * Delete an app
 */
export async function deleteApp(
  baseUrl: string,
  headers: Record<string, string>,
  appName: string,
  force: boolean = false
): Promise<void> {
  const url = new URL(`${baseUrl}/v1/apps/${appName}`);
  if (force) {
    url.searchParams.set('force', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete app: ${response.status} ${response.statusText} - ${error}`);
  }
}
