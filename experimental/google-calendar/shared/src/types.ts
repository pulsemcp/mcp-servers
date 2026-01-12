/**
 * Google Calendar API type definitions
 */

export interface CalendarEvent {
  id: string;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  recurrence?: string[];
  recurringEventId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  transparency?: string;
  visibility?: string;
  colorId?: string;
  iCalUID?: string;
  sequence?: number;
}

export interface CalendarEventList {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  items?: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface Calendar {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone: string;
  selected?: boolean;
  accessRole: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarList {
  kind: string;
  etag: string;
  items: Calendar[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface FreeBusyRequest {
  timeMin: string;
  timeMax: string;
  items: Array<{ id: string }>;
  timeZone?: string;
}

export interface FreeBusyResponse {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: {
    [calendarId: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
    };
  };
}
