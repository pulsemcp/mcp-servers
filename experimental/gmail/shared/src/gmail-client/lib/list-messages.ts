import type { EmailListItem } from '../../types.js';

/**
 * Handles common Gmail API errors with user-friendly messages
 */
function handleApiError(status: number, operation: string): never {
  if (status === 401) {
    throw new Error('Gmail access token expired or invalid. Please refresh your access token.');
  }
  if (status === 403) {
    throw new Error('Permission denied. Ensure your access token has the gmail.readonly scope.');
  }
  if (status === 429) {
    throw new Error('Gmail API rate limit exceeded. Please try again later.');
  }
  if (status === 404) {
    throw new Error('Gmail resource not found. The message or label may not exist.');
  }
  throw new Error(`Gmail API error while trying to ${operation}: HTTP ${status}`);
}

interface MessagesListResponse {
  messages?: EmailListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * Lists messages matching a query
 * Uses pagination to fetch results
 */
export async function listMessages(
  baseUrl: string,
  headers: Record<string, string>,
  options?: {
    q?: string; // Gmail search query
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  }
): Promise<{
  messages: EmailListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}> {
  const params = new URLSearchParams();

  if (options?.q) {
    params.set('q', options.q);
  }

  if (options?.maxResults) {
    params.set('maxResults', options.maxResults.toString());
  }

  if (options?.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  if (options?.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach((labelId) => params.append('labelIds', labelId));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/messages${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'list messages');
  }

  const data = (await response.json()) as MessagesListResponse;

  return {
    messages: data.messages ?? [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate,
  };
}
