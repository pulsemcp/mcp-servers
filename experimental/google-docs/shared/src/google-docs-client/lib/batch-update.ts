import { throwForGoogleApiError } from './api-errors.js';
import type { DocsBatchUpdateRequest, DocsBatchUpdateResponse } from '../../types.js';

const DOCS_BASE_URL = 'https://docs.googleapis.com/v1/documents';

export async function batchUpdate(
  headers: Record<string, string>,
  documentId: string,
  requests: DocsBatchUpdateRequest[]
): Promise<DocsBatchUpdateResponse> {
  const response = await fetch(`${DOCS_BASE_URL}/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    await throwForGoogleApiError(response, `Batch update document ${documentId}`);
  }

  return (await response.json()) as DocsBatchUpdateResponse;
}
