import type { Author } from '../../types.js';

export async function getAuthorById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<Author | null> {
  // The API doesn't have a direct endpoint to get author by ID,
  // so we need to fetch all authors and find the one with matching ID
  const url = new URL('/supervisor/authors', baseUrl);

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
    throw new Error(`Failed to fetch authors: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: Author[] };

  // The supervisor endpoint returns data in { data: [...] } format
  if (data.data && Array.isArray(data.data)) {
    const author = data.data.find((a) => a.id === id);
    return author || null;
  }

  return null;
}
