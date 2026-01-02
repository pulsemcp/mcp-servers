interface ReactionsAddResponse {
  ok: boolean;
  error?: string;
}

/**
 * Adds a reaction (emoji) to a message
 * @param name - The emoji name without colons (e.g., "thumbsup" not ":thumbsup:")
 */
export async function addReaction(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  timestamp: string,
  name: string
): Promise<void> {
  const body = {
    channel: channelId,
    timestamp,
    name,
  };

  const response = await fetch(`${baseUrl}/reactions.add`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to add reaction: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ReactionsAddResponse;

  if (!data.ok) {
    // already_reacted is not really an error for our purposes
    if (data.error === 'already_reacted') {
      return;
    }
    throw new Error(`Slack API error: ${data.error}`);
  }
}
