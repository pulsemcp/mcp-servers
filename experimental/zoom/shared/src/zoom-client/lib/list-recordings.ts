import type { ListRecordingsResponse } from '../../types.js';

export async function listRecordings(
  accessToken: string,
  options?: { from?: string; to?: string; page_size?: number; next_page_token?: string }
): Promise<ListRecordingsResponse> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.page_size) params.set('page_size', String(options.page_size));
  if (options?.next_page_token) params.set('next_page_token', options.next_page_token);

  const queryString = params.toString();
  const url = `https://api.zoom.us/v2/users/me/recordings${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to list recordings: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<ListRecordingsResponse>;
}
