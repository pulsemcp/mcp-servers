import type { CalendarEvent } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function createEvent(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  event: Partial<CalendarEvent>,
  options?: { supportsAttachments?: boolean }
): Promise<CalendarEvent> {
  const params = new URLSearchParams();
  if (options?.supportsAttachments) {
    params.set('supportsAttachments', 'true');
  }

  const queryString = params.toString();
  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events${queryString ? `?${queryString}` : ''}`;

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
