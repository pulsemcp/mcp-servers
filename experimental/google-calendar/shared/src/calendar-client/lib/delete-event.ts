import { handleApiError } from './api-errors.js';

export async function deleteEvent(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  eventId: string,
  options?: { sendUpdates?: 'all' | 'externalOnly' | 'none' }
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.sendUpdates) {
    params.set('sendUpdates', options.sendUpdates);
  }

  const queryString = params.toString();
  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    handleApiError(response.status, 'deleting calendar event', eventId);
  }

  // DELETE returns 204 No Content on success
}
