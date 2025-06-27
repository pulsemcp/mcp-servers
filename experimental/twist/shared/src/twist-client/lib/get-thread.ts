import type { ThreadWithMessages, Message } from '../../server.js';

export async function getThread(
  baseUrl: string,
  headers: Record<string, string>,
  threadId: string
): Promise<ThreadWithMessages> {
  // First get the thread details
  const threadUrl = `${baseUrl}/threads/getone?id=${threadId}`;

  const threadResponse = await fetch(threadUrl, {
    method: 'GET',
    headers,
  });

  if (!threadResponse.ok) {
    throw new Error(`Failed to get thread: ${threadResponse.status} ${threadResponse.statusText}`);
  }

  const thread = (await threadResponse.json()) as ThreadWithMessages;

  // Then get the messages/comments for this thread
  const messagesUrl = `${baseUrl}/comments/get?thread_id=${threadId}`;

  const messagesResponse = await fetch(messagesUrl, {
    method: 'GET',
    headers,
  });

  if (!messagesResponse.ok) {
    throw new Error(
      `Failed to get thread messages: ${messagesResponse.status} ${messagesResponse.statusText}`
    );
  }

  const messages = (await messagesResponse.json()) as Array<Message>;
  thread.messages = messages;

  return thread;
}
