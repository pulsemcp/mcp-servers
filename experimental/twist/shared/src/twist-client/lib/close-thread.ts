import type { Message } from '../../server.js';

export async function closeThread(
  baseUrl: string,
  headers: Record<string, string>,
  threadId: string,
  message?: string
): Promise<Message> {
  const url = `${baseUrl}/comments/add`;

  const body = {
    thread_id: threadId,
    content: message || 'Thread closed',
    thread_action: 'close',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to close thread: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as Message;
  return result;
}
