import type { EmailListItem } from '../../types.js';

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
    const errorText = await response.text();
    throw new Error(
      `Failed to list messages: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as MessagesListResponse;

  return {
    messages: data.messages ?? [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate,
  };
}
