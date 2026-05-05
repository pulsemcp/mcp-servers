import { throwForGoogleApiError } from './api-errors.js';
import type { GoogleDoc } from '../../types.js';

const DOCS_BASE_URL = 'https://docs.googleapis.com/v1/documents';

export async function createDocument(
  headers: Record<string, string>,
  options?: { title?: string }
): Promise<GoogleDoc> {
  const body = options?.title ? { title: options.title } : {};
  const response = await fetch(DOCS_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwForGoogleApiError(response, 'Create document');
  }

  return (await response.json()) as GoogleDoc;
}
