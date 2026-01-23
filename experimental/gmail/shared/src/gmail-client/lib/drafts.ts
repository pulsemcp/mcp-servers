import type { Email, EmailListItem } from '../../types.js';
import { handleApiError } from './api-errors.js';

interface Draft {
  id: string;
  message: Email;
}

interface DraftListItem {
  id: string;
  message: EmailListItem;
}

interface DraftsListResponse {
  drafts?: DraftListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

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
 * Creates a new draft email
 */
export async function createDraft(
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
): Promise<Draft> {
  const url = `${baseUrl}/drafts`;

  const rawMessage = buildMimeMessage(from, options);
  const encodedMessage = toBase64Url(rawMessage);

  const requestBody: {
    message: { raw: string; threadId?: string };
  } = {
    message: {
      raw: encodedMessage,
    },
  };

  if (options.threadId) {
    requestBody.message.threadId = options.threadId;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    handleApiError(response.status, 'creating draft');
  }

  return (await response.json()) as Draft;
}

/**
 * Gets a draft by ID
 */
export async function getDraft(
  baseUrl: string,
  headers: Record<string, string>,
  draftId: string
): Promise<Draft> {
  const url = `${baseUrl}/drafts/${draftId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'getting draft', draftId);
  }

  return (await response.json()) as Draft;
}

/**
 * Lists drafts
 */
export async function listDrafts(
  baseUrl: string,
  headers: Record<string, string>,
  options?: {
    maxResults?: number;
    pageToken?: string;
  }
): Promise<{
  drafts: DraftListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}> {
  const params = new URLSearchParams();

  if (options?.maxResults) {
    params.set('maxResults', options.maxResults.toString());
  }

  if (options?.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  const queryString = params.toString();
  const url = `${baseUrl}/drafts${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'listing drafts');
  }

  const data = (await response.json()) as DraftsListResponse;

  return {
    drafts: data.drafts ?? [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate,
  };
}

/**
 * Deletes a draft
 */
export async function deleteDraft(
  baseUrl: string,
  headers: Record<string, string>,
  draftId: string
): Promise<void> {
  const url = `${baseUrl}/drafts/${draftId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'deleting draft', draftId);
  }
}
