import type { CalendarEvent } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function updateEvent(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>,
  options?: { sendUpdates?: 'all' | 'externalOnly' | 'none' }
): Promise<CalendarEvent> {
  const params = new URLSearchParams();
  if (options?.sendUpdates) {
    params.set('sendUpdates', options.sendUpdates);
  }

  const queryString = params.toString();
  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    handleApiError(response.status, 'updating calendar event', eventId);
  }

  return (await response.json()) as CalendarEvent;
}
