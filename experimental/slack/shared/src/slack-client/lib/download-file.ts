/**
 * Downloads a file from Slack using an authenticated URL.
 * Slack's url_private requires the bot token in the Authorization header.
 */
export async function downloadFile(
  headers: Record<string, string>,
  fileUrl: string
): Promise<Buffer> {
  const response = await fetch(fileUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
