import type { Author } from '../../types.js';

// Simple in-memory cache for authors with TTL
let authorsCache: Map<number, Author> | null = null;
let authorsCacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

async function fetchAndCacheAuthors(apiKey: string, baseUrl: string): Promise<Map<number, Author>> {
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

  const cache = new Map<number, Author>();
  if (data.data && Array.isArray(data.data)) {
    for (const author of data.data) {
      cache.set(author.id, author);
    }
  }

  authorsCache = cache;
  authorsCacheTimestamp = Date.now();
  return cache;
}

export async function getAuthorById(
  apiKey: string,
  baseUrl: string,
  id: number
): Promise<Author | null> {
  // Check if cache is valid
  const now = Date.now();
  if (!authorsCache || now - authorsCacheTimestamp > CACHE_TTL_MS) {
    await fetchAndCacheAuthors(apiKey, baseUrl);
  }

  return authorsCache?.get(id) || null;
}
