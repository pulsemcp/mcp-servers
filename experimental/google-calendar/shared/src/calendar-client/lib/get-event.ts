import type { CalendarEvent } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function getEvent(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  eventId: string
): Promise<CalendarEvent> {
  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response.status, 'getting calendar event', eventId);
  }

  return (await response.json()) as CalendarEvent;
}
