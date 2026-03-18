import type { ListMeetingsResponse } from '../../types.js';

export async function listMeetings(
  accessToken: string,
  options?: { type?: string; page_size?: number; next_page_token?: string }
): Promise<ListMeetingsResponse> {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.page_size) params.set('page_size', String(options.page_size));
  if (options?.next_page_token) params.set('next_page_token', options.next_page_token);

  const queryString = params.toString();
  const url = `https://api.zoom.us/v2/users/me/meetings${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list meetings: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ListMeetingsResponse>;
}
