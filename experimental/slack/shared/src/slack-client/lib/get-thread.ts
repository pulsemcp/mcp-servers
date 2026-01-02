import type { Message } from '../../types.js';

interface ConversationsRepliesResponse {
  ok: boolean;
  messages?: Message[];
  has_more?: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

/**
 * Fetches all replies in a thread
 * The first message is the parent message, followed by replies
 */
export async function getThread(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  threadTs: string,
  options?: {
    limit?: number;
    cursor?: string;
    oldest?: string;
    latest?: string;
    inclusive?: boolean;
  }
): Promise<{
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  const params = new URLSearchParams({
    channel: channelId,
    ts: threadTs,
    limit: (options?.limit ?? 100).toString(),
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

  const response = await fetch(`${baseUrl}/conversations.replies?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch thread: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ConversationsRepliesResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    messages: data.messages ?? [],
    hasMore: data.has_more ?? false,
    nextCursor: data.response_metadata?.next_cursor,
  };
}
