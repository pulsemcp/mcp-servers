import { vi } from 'vitest';
import type { ICalendarClient } from '../../shared/src/server.js';
import type {
  CalendarEvent,
  CalendarEventList,
  CalendarList,
  FreeBusyResponse,
} from '../../shared/src/types.js';

export function createMockCalendarClient(): ICalendarClient {
  const mockEvents: CalendarEvent[] = [
    {
      id: 'event1',
      summary: 'Team Standup',
      description: 'Daily team sync',
      start: {
        dateTime: '2024-01-15T10:00:00-05:00',
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: '2024-01-15T10:30:00-05:00',
        timeZone: 'America/New_York',
      },
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/event?eid=event1',
      attendees: [
        {
          email: 'user1@example.com',
          responseStatus: 'accepted',
        },
      ],
    },
    {
      id: 'event2',
      summary: 'Project Meeting',
      location: 'Conference Room B',
      start: {
        dateTime: '2024-01-16T14:00:00-05:00',
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: '2024-01-16T15:00:00-05:00',
        timeZone: 'America/New_York',
      },
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/event?eid=event2',
    },
  ];

  return {
    listEvents: vi.fn().mockImplementation(async (calendarId, options) => {
      const filtered = options?.q
        ? mockEvents.filter((e) => e.summary?.toLowerCase().includes(options.q!.toLowerCase()))
        : mockEvents;

      const result: CalendarEventList = {
        kind: 'calendar#events',
        etag: 'mock-etag',
        summary: calendarId === 'primary' ? 'Primary Calendar' : calendarId,
        updated: new Date().toISOString(),
        timeZone: 'America/New_York',
        accessRole: 'owner',
        items: filtered.slice(0, options?.maxResults || 10),
      };

      return result;
    }),

    getEvent: vi.fn().mockImplementation(async (calendarId, eventId) => {
      const event = mockEvents.find((e) => e.id === eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      return event;
    }),

    createEvent: vi.fn().mockImplementation(async (calendarId, event) => {
      return {
        id: 'new-event-id',
        summary: event.summary || 'New Event',
        description: event.description,
        location: event.location,
        start: event.start || {
          dateTime: '2024-01-20T10:00:00-05:00',
          timeZone: 'America/New_York',
        },
        end: event.end || { dateTime: '2024-01-20T11:00:00-05:00', timeZone: 'America/New_York' },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=new-event-id',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        attendees: event.attendees,
        attachments: event.attachments,
      } as CalendarEvent;
    }),

    updateEvent: vi.fn().mockImplementation(async (calendarId, eventId, event, _options) => {
      const existingEvent = mockEvents.find((e) => e.id === eventId);
      if (!existingEvent) {
        throw new Error(`Event not found: ${eventId}`);
      }
      return {
        id: eventId,
        summary: event.summary || existingEvent.summary,
        description: event.description || existingEvent.description,
        location: event.location || existingEvent.location,
        start: event.start || existingEvent.start,
        end: event.end || existingEvent.end,
        status: 'confirmed',
        htmlLink: `https://calendar.google.com/event?eid=${eventId}`,
        created: existingEvent.created || '2024-01-01T00:00:00Z',
        updated: new Date().toISOString(),
        attendees: event.attendees || existingEvent.attendees,
        attachments: event.attachments || existingEvent.attachments,
      } as CalendarEvent;
    }),

    deleteEvent: vi.fn().mockImplementation(async (calendarId, eventId, _options) => {
      const existingEvent = mockEvents.find((e) => e.id === eventId);
      if (!existingEvent) {
        throw new Error(`Event not found: ${eventId}`);
      }
      // Success - event deleted (void return)
    }),

    listCalendars: vi.fn().mockImplementation(async () => {
      const result: CalendarList = {
        kind: 'calendar#calendarList',
        etag: 'mock-etag',
        items: [
          {
            kind: 'calendar#calendarListEntry',
            etag: 'mock-etag-1',
            id: 'primary',
            summary: 'Primary Calendar',
            timeZone: 'America/New_York',
            accessRole: 'owner',
            primary: true,
          },
          {
            kind: 'calendar#calendarListEntry',
            etag: 'mock-etag-2',
            id: 'work@example.com',
            summary: 'Work Calendar',
            timeZone: 'America/New_York',
            accessRole: 'writer',
          },
        ],
      };
      return result;
    }),

    queryFreebusy: vi.fn().mockImplementation(async (request) => {
      const result: FreeBusyResponse = {
        kind: 'calendar#freeBusy',
        timeMin: request.timeMin,
        timeMax: request.timeMax,
        calendars: {
          primary: {
            busy: [
              {
                start: '2024-01-15T10:00:00-05:00',
                end: '2024-01-15T10:30:00-05:00',
              },
            ],
          },
        },
      };
      return result;
    }),
  };
}
