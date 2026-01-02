import type { Message } from '../../types.js';

interface ChatPostMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: Message;
  error?: string;
}

/**
 * Posts a new message to a channel
 */
export async function postMessage(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  text: string,
  options?: {
    threadTs?: string; // If set, posts as a reply in the thread
    replyBroadcast?: boolean; // Also post to channel when replying to thread
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
  }
): Promise<Message> {
  const body: Record<string, unknown> = {
    channel: channelId,
    text,
  };

  if (options?.threadTs) {
    body.thread_ts = options.threadTs;
  }
  if (options?.replyBroadcast !== undefined) {
    body.reply_broadcast = options.replyBroadcast;
  }
  if (options?.unfurlLinks !== undefined) {
    body.unfurl_links = options.unfurlLinks;
  }
  if (options?.unfurlMedia !== undefined) {
    body.unfurl_media = options.unfurlMedia;
  }

  const response = await fetch(`${baseUrl}/chat.postMessage`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to post message: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ChatPostMessageResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  if (!data.message) {
    throw new Error('Message not found in response');
  }

  // Ensure ts is set on the message
  return {
    ...data.message,
    ts: data.ts ?? data.message.ts,
  };
}
