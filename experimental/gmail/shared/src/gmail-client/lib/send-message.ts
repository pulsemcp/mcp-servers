import type { Email } from '../../types.js';
import { handleApiError } from './api-errors.js';
import { buildMimeMessage, type MimeAttachment } from './mime-utils.js';
import { requestWithRawMessage } from './raw-message-request.js';

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
    plaintextBody?: string;
    htmlBody?: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: MimeAttachment[];
  }
): Promise<Email> {
  const rawMessage = buildMimeMessage(from, options);

  const response = await requestWithRawMessage(
    baseUrl,
    '/messages/send',
    'POST',
    headers,
    rawMessage,
    (raw) => ({
      ...(raw !== undefined && { raw }),
      ...(options.threadId && { threadId: options.threadId }),
    })
  );

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
