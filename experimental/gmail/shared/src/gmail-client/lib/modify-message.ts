import type { Email } from '../../types.js';
import { handleApiError } from './api-errors.js';

/**
 * Modifies labels on a message
 * Used for marking read/unread, starring, archiving, etc.
 */
export async function modifyMessage(
  baseUrl: string,
  headers: Record<string, string>,
  messageId: string,
  options: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }
): Promise<Email> {
  const url = `${baseUrl}/messages/${messageId}/modify`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      addLabelIds: options.addLabelIds || [],
      removeLabelIds: options.removeLabelIds || [],
    }),
  });

  if (!response.ok) {
    handleApiError(response.status, 'modifying message', messageId);
  }

  return (await response.json()) as Email;
}
