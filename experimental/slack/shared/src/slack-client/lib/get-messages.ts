import type { Message } from '../../types.js';

interface ConversationsHistoryResponse {
  ok: boolean;
  messages?: Message[];
  has_more?: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

/**
 * Fetches message history from a channel
 * Returns messages in reverse chronological order (newest first)
 */
export async function getMessages(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  options?: {
    limit?: number;
    cursor?: string;
    oldest?: string; // Unix timestamp
    latest?: string; // Unix timestamp
    inclusive?: boolean;
  }
): Promise<{
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  const params = new URLSearchParams({
    channel: channelId,
    limit: (options?.limit ?? 20).toString(),
  });

  if (options?.cursor) {
    params.set('cursor', options.cursor);
  }
  if (options?.oldest) {
    params.set('oldest', options.oldest);
  }
  if (options?.latest) {
    params.set('latest', options.latest);
  }
  if (options?.inclusive !== undefined) {
    params.set('inclusive', options.inclusive.toString());
  }

  const response = await fetch(`${baseUrl}/conversations.history?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ConversationsHistoryResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    messages: data.messages ?? [],
    hasMore: data.has_more ?? false,
    nextCursor: data.response_metadata?.next_cursor,
  };
}
