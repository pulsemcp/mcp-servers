import type { Email } from '../../types.js';
import { handleApiError } from './api-errors.js';
import { buildMimeMessage, toBase64Url } from './mime-utils.js';

/**
 * Sends an email directly
 */
export async function sendMessage(
  baseUrl: string,
  headers: Record<string, string>,
  from: string,
  options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<Email> {
  const url = `${baseUrl}/messages/send`;

  const rawMessage = buildMimeMessage(from, options);
  const encodedMessage = toBase64Url(rawMessage);

  const requestBody: { raw: string; threadId?: string } = {
    raw: encodedMessage,
  };

  if (options.threadId) {
    requestBody.threadId = options.threadId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    handleApiError(response.status, 'sending message');
  }

  return (await response.json()) as Email;
}

/**
 * Sends a draft (and deletes it)
 */
export async function sendDraft(
  baseUrl: string,
  headers: Record<string, string>,
  draftId: string
): Promise<Email> {
  const url = `${baseUrl}/drafts/send`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: draftId }),
  });

  if (!response.ok) {
    handleApiError(response.status, 'sending draft', draftId);
  }

  return (await response.json()) as Email;
}
