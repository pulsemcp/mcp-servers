import type { Channel } from '../../server.js';

export async function getChannels(
  baseUrl: string,
  headers: Record<string, string>,
  workspaceId: string
): Promise<Array<Channel>> {
  const url = `${baseUrl}/channels/get?workspace_id=${workspaceId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get channels: ${response.status} ${response.statusText}`);
  }

  const channels = (await response.json()) as Array<Channel>;
  return channels;
}
