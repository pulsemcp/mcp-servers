import type { CalendarList } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function listCalendars(
  baseUrl: string,
  headers: Record<string, string>,
  options?: {
    maxResults?: number;
    pageToken?: string;
  }
): Promise<CalendarList> {
  const params = new URLSearchParams();

  if (options?.maxResults) params.append('maxResults', options.maxResults.toString());
  if (options?.pageToken) params.append('pageToken', options.pageToken);

  const url = `${baseUrl}/users/me/calendarList?${params}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    handleApiError(response.status, 'listing calendars');
  }

  return (await response.json()) as CalendarList;
}
