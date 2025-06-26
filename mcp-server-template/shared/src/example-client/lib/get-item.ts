/**
 * Example API method for getting an item by ID.
 * Each API method should be in its own file for better organization.
 *
 * @param apiKey - The API key for authentication
 * @param itemId - The ID of the item to retrieve
 * @returns The item data
 */
export async function getItem(
  apiKey: string,
  itemId: string
): Promise<{ id: string; name: string; value: string }> {
  // Example implementation - replace with actual API call
  const response = await fetch(`https://api.example.com/items/${itemId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get item: ${response.statusText}`);
  }

  return response.json();
}
