import type { Email, EmailListItem } from '../../types.js';
import { handleApiError } from './api-errors.js';
import { buildMimeMessage, toBase64Url } from './mime-utils.js';

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
