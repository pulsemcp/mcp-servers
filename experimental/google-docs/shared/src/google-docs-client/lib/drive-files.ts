import { throwForGoogleApiError } from './api-errors.js';
import type { DriveFile } from '../../types.js';

const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Move a Drive file to the trash. Reversible — the user can restore from
 * Drive's trash for 30 days before Google permanently removes it.
 *
 * Uses Drive `files.update` with `trashed: true` rather than `files.delete`
 * so the operation is undoable.
 */
export async function trashFile(
  headers: Record<string, string>,
  fileId: string
): Promise<DriveFile> {
  const response = await fetch(
    `${DRIVE_BASE_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ trashed: true }),
    }
  );

  if (!response.ok) {
    await throwForGoogleApiError(response, `Trash file ${fileId}`);
  }

  return (await response.json()) as DriveFile;
}

/**
 * Permanently delete a Drive file. Bypasses the trash entirely.
 * Caller must explicitly opt in.
 */
export async function permanentlyDeleteFile(
  headers: Record<string, string>,
  fileId: string
): Promise<void> {
  const response = await fetch(
    `${DRIVE_BASE_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: 'DELETE',
      headers,
    }
  );

  // Drive returns 204 on success.
  if (!response.ok && response.status !== 204) {
    await throwForGoogleApiError(response, `Delete file ${fileId}`);
  }
}

/**
 * Export a Google Doc as another format (PDF, DOCX, HTML, plain text, markdown).
 * Drive's export endpoint streams the converted bytes.
 *
 * Returns the response body as a Uint8Array for binary formats and as a string
 * for text formats. Caller decides which based on `mimeType`.
 */
export async function exportFile(
  headers: Record<string, string>,
  fileId: string,
  mimeType: string
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const url = `${DRIVE_BASE_URL}/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(mimeType)}`;
  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    await throwForGoogleApiError(response, `Export file ${fileId} as ${mimeType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(arrayBuffer),
    mimeType: response.headers.get('content-type') || mimeType,
  };
}
