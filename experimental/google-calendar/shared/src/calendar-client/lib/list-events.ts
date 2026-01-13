import type { CalendarEventList } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function listEvents(
  baseUrl: string,
  headers: Record<string, string>,
  calendarId: string,
  options?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    pageToken?: string;
    q?: string;
    singleEvents?: boolean;
    orderBy?: string;
  }
): Promise<CalendarEventList> {
  const params = new URLSearchParams();

  if (options?.timeMin) params.append('timeMin', options.timeMin);
  if (options?.timeMax) params.append('timeMax', options.timeMax);
  if (options?.maxResults) params.append('maxResults', options.maxResults.toString());
  if (options?.pageToken) params.append('pageToken', options.pageToken);
  if (options?.q) params.append('q', options.q);
  if (options?.singleEvents !== undefined)
    params.append('singleEvents', options.singleEvents.toString());
  if (options?.orderBy) params.append('orderBy', options.orderBy);

  const url = `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response.status, 'listing calendar events', calendarId);
  }

  return (await response.json()) as CalendarEventList;
}
