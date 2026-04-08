import type { SlackFile } from '../../types.js';

interface FilesInfoResponse {
  ok: boolean;
  file?: SlackFile;
  error?: string;
}

/**
 * Fetches information about a specific file using Slack's files.info API
 */
export async function getFileInfo(
  baseUrl: string,
  headers: Record<string, string>,
  fileId: string
): Promise<SlackFile> {
  const params = new URLSearchParams({
    file: fileId,
  });

  const response = await fetch(`${baseUrl}/files.info?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file info: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as FilesInfoResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  if (!data.file) {
    throw new Error('File not found in response');
  }

  return data.file;
}
