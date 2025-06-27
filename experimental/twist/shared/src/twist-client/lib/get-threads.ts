import type { Thread } from '../../server.js';

export async function getThreads(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  options?: { limit?: number; newerThanTs?: number }
): Promise<Array<Thread>> {
  const params = new URLSearchParams({
    channel_id: channelId,
    limit: String(options?.limit || 100),
  });

  if (options?.newerThanTs) {
    params.append('newer_than_ts', String(options.newerThanTs));
  }

  const url = `${baseUrl}/threads/get?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get threads: ${response.status} ${response.statusText}`);
  }

  const threads = (await response.json()) as Array<Thread>;
  return threads;
}
