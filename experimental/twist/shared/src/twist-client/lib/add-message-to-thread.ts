import type { Message } from '../../server.js';

export async function addMessageToThread(
  baseUrl: string,
  headers: Record<string, string>,
  threadId: string,
  content: string
): Promise<Message> {
  const url = `${baseUrl}/comments/add`;

  const body = {
    thread_id: threadId,
    content,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to add message to thread: ${response.status} ${response.statusText}`);
  }

  const message = (await response.json()) as Message;
  return message;
}
