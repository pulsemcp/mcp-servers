import type { Message } from '../../types.js';

interface ChatUpdateResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  text?: string;
  message?: Message;
  error?: string;
}

/**
 * Updates an existing message
 */
export async function updateMessage(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  ts: string,
  text: string
): Promise<Message> {
  const body = {
    channel: channelId,
    ts,
    text,
  };

  const response = await fetch(`${baseUrl}/chat.update`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to update message: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ChatUpdateResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  // Return the updated message
  return {
    type: 'message',
    ts: data.ts ?? ts,
    text: data.text ?? text,
    ...data.message,
  };
}
