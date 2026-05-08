/**
 * Accepts either a raw Google Docs document ID or a full URL such as:
 *   https://docs.google.com/document/d/{ID}/edit
 *   https://docs.google.com/document/d/{ID}
 *   https://docs.google.com/document/u/0/d/{ID}/edit
 *   https://drive.google.com/open?id={ID}
 *   https://docs.google.com/open?id={ID}
 * and returns the bare document ID.
 *
 * Throws if neither a document URL nor a plausible ID can be extracted.
 */
export function parseDocumentId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Document ID or URL is required');
  }

  const trimmed = input.trim();

  const pathMatch = trimmed.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) {
    return queryMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error(
    `Could not parse a Google Docs document ID from "${input}". ` +
      'Expected a URL like https://docs.google.com/document/d/{ID}/edit or a raw document ID.'
  );
}
