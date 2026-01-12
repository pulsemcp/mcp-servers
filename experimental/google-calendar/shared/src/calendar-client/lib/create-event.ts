import type { CalendarEvent } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function createEvent(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    handleApiError(response.status, 'creating calendar event', calendarId);
  }

  return (await response.json()) as CalendarEvent;
}
