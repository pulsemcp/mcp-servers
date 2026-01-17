export async function deleteSecret(
  apiKey: string,
  baseUrl: string,
  idOrSlug: number | string
): Promise<{ success: boolean; message: string }> {
  const url = new URL(`/api/secrets/${idOrSlug}`, baseUrl);

  const response = await fetch(url.toString(), {
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
      throw new Error(`Secret with ID/slug ${idOrSlug} not found`);
    }
    throw new Error(`Failed to delete secret: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { success: boolean; message: string };
  return data;
}
