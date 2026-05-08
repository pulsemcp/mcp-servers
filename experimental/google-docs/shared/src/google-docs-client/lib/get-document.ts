import { throwForGoogleApiError } from './api-errors.js';
import type { GoogleDoc } from '../../types.js';

const DOCS_BASE_URL = 'https://docs.googleapis.com/v1/documents';

export async function getDocument(
  headers: Record<string, string>,
  documentId: string
): Promise<GoogleDoc> {
  const response = await fetch(`${DOCS_BASE_URL}/${encodeURIComponent(documentId)}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    await throwForGoogleApiError(response, `Get document ${documentId}`);
  }

  return (await response.json()) as GoogleDoc;
}
