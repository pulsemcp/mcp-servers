/**
 * Example API method for searching items.
 * Demonstrates a more complex API method with query parameters.
 *
 * @param apiKey - The API key for authentication
 * @param query - The search query
 * @param options - Additional search options
 * @returns Array of matching items
 */
export async function searchItems(
  apiKey: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'created' | 'updated';
  }
): Promise<Array<{ id: string; name: string; score: number }>> {
  // Build query parameters
  const params = new URLSearchParams({
    q: query,
    limit: (options?.limit || 10).toString(),
    offset: (options?.offset || 0).toString(),
    sort: options?.sortBy || 'name',
  });

  // Example implementation - replace with actual API call
  const response = await fetch(`https://api.example.com/items/search?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}
