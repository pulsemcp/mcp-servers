import type { Thread } from '../../server.js';

export async function createThread(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  title: string,
  content: string
): Promise<Thread> {
  const url = `${baseUrl}/threads/add`;

  const body = {
    title,
    content,
    channel_id: channelId,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to create thread: ${response.status} ${response.statusText}`);
  }

  const thread = (await response.json()) as Thread;
  return thread;
}
