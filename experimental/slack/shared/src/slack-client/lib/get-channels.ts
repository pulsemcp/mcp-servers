import type { Channel } from '../../types.js';

interface ConversationsListResponse {
  ok: boolean;
  channels?: Channel[];
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

/**
 * Fetches all channels the bot has access to
 * Uses cursor-based pagination to get all results
 */
export async function getChannels(
  baseUrl: string,
  headers: Record<string, string>,
  options?: {
    types?: string; // comma-separated: public_channel,private_channel,mpim,im
    excludeArchived?: boolean;
    limit?: number;
  }
): Promise<Channel[]> {
  const allChannels: Channel[] = [];
  let cursor: string | undefined;

  const types = options?.types ?? 'public_channel,private_channel';
  const excludeArchived = options?.excludeArchived ?? true;
  const limit = options?.limit ?? 200;

  do {
    const params = new URLSearchParams({
      types,
      exclude_archived: excludeArchived.toString(),
      limit: limit.toString(),
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await fetch(`${baseUrl}/conversations.list?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ConversationsListResponse;

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    if (data.channels) {
      allChannels.push(...data.channels);
    }

    cursor = data.response_metadata?.next_cursor;
  } while (cursor);

  return allChannels;
}
