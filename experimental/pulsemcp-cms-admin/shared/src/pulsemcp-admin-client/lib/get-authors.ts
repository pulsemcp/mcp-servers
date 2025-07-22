import type { AuthorsResponse } from '../../types.js';

export async function getAuthors(
  apiKey: string,
  baseUrl: string,
  params?: {
    search?: string;
    page?: number;
  }
): Promise<AuthorsResponse> {
  const url = new URL(`${baseUrl}/authors`);

  if (params?.search) {
    url.searchParams.append('search', params.search);
  }
  if (params?.page) {
    url.searchParams.append('page', params.page.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch authors: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<AuthorsResponse>;
}
