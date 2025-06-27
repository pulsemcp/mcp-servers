import type { Channel } from '../../server.js';

export async function getChannel(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string
): Promise<Channel> {
  const url = `${baseUrl}/channels/getone?id=${channelId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get channel: ${response.status} ${response.statusText}`);
  }

  const channel = (await response.json()) as Channel;
  return channel;
}
