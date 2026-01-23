import type { Email } from '../../types.js';
import { handleApiError } from './api-errors.js';

/**
 * Builds a MIME message from email options
 */
function buildMimeMessage(
  from: string,
  options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    inReplyTo?: string;
    references?: string;
  }
): string {
  const headers: string[] = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];

  if (options.cc) {
    headers.push(`Cc: ${options.cc}`);
  }

  if (options.bcc) {
    headers.push(`Bcc: ${options.bcc}`);
  }

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }

  if (options.references) {
    headers.push(`References: ${options.references}`);
  }

  return headers.join('\r\n') + '\r\n\r\n' + options.body;
}

/**
 * Converts a string to base64url encoding
 */
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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
