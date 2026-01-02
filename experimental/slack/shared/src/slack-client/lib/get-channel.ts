import type { Channel } from '../../types.js';

interface ConversationsInfoResponse {
  ok: boolean;
  channel?: Channel;
  error?: string;
}

/**
 * Fetches information about a specific channel
 */
export async function getChannel(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string
): Promise<Channel> {
  const params = new URLSearchParams({
    channel: channelId,
    include_num_members: 'true',
  });

  const response = await fetch(`${baseUrl}/conversations.info?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channel: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ConversationsInfoResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  if (!data.channel) {
    throw new Error('Channel not found in response');
  }

  return data.channel;
}
