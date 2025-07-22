import type { Author } from '../../types.js';

export async function getAuthorBySlug(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<Author> {
  const response = await fetch(`${baseUrl}/authors/${slug}`, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch author: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Author>;
}
