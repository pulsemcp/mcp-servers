import type { Email } from '../../types.js';

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
    const errorText = await response.text();
    throw new Error(
      `Failed to get message: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return (await response.json()) as Email;
}
