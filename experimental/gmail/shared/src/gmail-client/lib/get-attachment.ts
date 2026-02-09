import { handleApiError } from './api-errors.js';

/**
 * Attachment data returned by the Gmail API
 */
export interface AttachmentData {
  /** Base64url-encoded attachment data */
  data: string;
  /** Size of the attachment in bytes */
  size: number;
}

/**
 * Gets attachment data for a specific attachment on a message
 * Uses the Gmail API: GET /messages/{messageId}/attachments/{attachmentId}
 */
export async function getAttachment(
  baseUrl: string,
  headers: Record<string, string>,
  messageId: string,
  attachmentId: string
): Promise<AttachmentData> {
  const url = `${baseUrl}/messages/${messageId}/attachments/${attachmentId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'getting attachment', attachmentId);
  }

  return (await response.json()) as AttachmentData;
}
