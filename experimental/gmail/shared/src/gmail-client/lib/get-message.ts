import type { Email } from '../../types.js';

/**
 * Handles common Gmail API errors with user-friendly messages
 */
function handleApiError(status: number, messageId: string): never {
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
    throw new Error(`Message not found: ${messageId}`);
  }
  throw new Error(`Gmail API error while getting message: HTTP ${status}`);
}

/**
 * Gets a specific message by ID
 * Supports different format levels for detail control
 */
export async function getMessage(
  baseUrl: string,
  headers: Record<string, string>,
  messageId: string,
  options?: {
    format?: 'minimal' | 'full' | 'raw' | 'metadata';
    metadataHeaders?: string[];
  }
): Promise<Email> {
  const params = new URLSearchParams();

  if (options?.format) {
    params.set('format', options.format);
  }

  if (options?.metadataHeaders && options.metadataHeaders.length > 0) {
    options.metadataHeaders.forEach((header) => params.append('metadataHeaders', header));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/messages/${messageId}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, messageId);
  }

  return (await response.json()) as Email;
}
