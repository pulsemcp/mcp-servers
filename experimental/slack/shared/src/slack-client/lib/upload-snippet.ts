import type { SlackFile } from '../../types.js';

interface GetUploadURLResponse {
  ok: boolean;
  upload_url?: string;
  file_id?: string;
  error?: string;
}

interface CompleteUploadResponse {
  ok: boolean;
  files?: SlackFile[];
  error?: string;
}

/**
 * Uploads text content as a snippet/file to Slack using the modern
 * files.getUploadURLExternal + files.completeUploadExternal flow.
 *
 * The deprecated files.upload API stopped working for new apps in May 2024
 * and was fully retired in November 2025.
 */
export async function uploadSnippet(
  baseUrl: string,
  headers: Record<string, string>,
  content: string,
  options: {
    channelId: string;
    filename?: string;
    title?: string;
    threadTs?: string;
  }
): Promise<SlackFile> {
  const filename = options.filename ?? 'snippet.txt';
  const contentBuffer = Buffer.from(content, 'utf-8');
  const length = contentBuffer.length;

  // Step 1: Get an upload URL from Slack
  const params = new URLSearchParams({
    filename,
    length: length.toString(),
  });

  const uploadUrlResponse = await fetch(`${baseUrl}/files.getUploadURLExternal?${params}`, {
    method: 'GET',
    headers,
  });

  if (!uploadUrlResponse.ok) {
    throw new Error(
      `Failed to get upload URL: ${uploadUrlResponse.status} ${uploadUrlResponse.statusText}`
    );
  }

  const uploadUrlData = (await uploadUrlResponse.json()) as GetUploadURLResponse;

  if (!uploadUrlData.ok) {
    throw new Error(`Slack API error (getUploadURLExternal): ${uploadUrlData.error}`);
  }

  if (!uploadUrlData.upload_url || !uploadUrlData.file_id) {
    throw new Error('Missing upload_url or file_id in response');
  }

  // Step 2: Upload the file content to the presigned URL (no auth headers needed)
  const uploadResponse = await fetch(uploadUrlData.upload_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: contentBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload file content: ${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  // Step 3: Complete the upload and share in channel
  const completeBody: {
    files: Array<{ id: string; title?: string }>;
    channel_id: string;
    thread_ts?: string;
  } = {
    files: [
      {
        id: uploadUrlData.file_id,
        title: options.title,
      },
    ],
    channel_id: options.channelId,
  };

  if (options.threadTs) {
    completeBody.thread_ts = options.threadTs;
  }

  const completeResponse = await fetch(`${baseUrl}/files.completeUploadExternal`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(completeBody),
  });

  if (!completeResponse.ok) {
    throw new Error(
      `Failed to complete upload: ${completeResponse.status} ${completeResponse.statusText}`
    );
  }

  const completeData = (await completeResponse.json()) as CompleteUploadResponse;

  if (!completeData.ok) {
    throw new Error(`Slack API error (completeUploadExternal): ${completeData.error}`);
  }

  const file = completeData.files?.[0];
  if (!file) {
    // Return a minimal file object using the file_id we already know
    return {
      id: uploadUrlData.file_id,
      name: filename,
      title: options.title,
    };
  }

  return file;
}
