import type { ZoomMeeting } from '../../types.js';

export async function getMeeting(accessToken: string, meetingId: string): Promise<ZoomMeeting> {
  const url = `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get meeting: ${response.status} ${response.statusText} - ${body}`);
  }

  return response.json() as Promise<ZoomMeeting>;
}
