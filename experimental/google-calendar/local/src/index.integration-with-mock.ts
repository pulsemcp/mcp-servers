#!/usr/bin/env node
/**
 * Integration test entry point with mock Google Calendar client
 * Used by TestMCPClient for integration tests
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, type ICalendarClient } from '../shared/index.js';
import { logServerStart } from '../shared/logging.js';
import type {
  CalendarEvent,
  CalendarEventList,
  CalendarList,
  FreeBusyRequest,
  FreeBusyResponse,
} from '../shared/types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

/**
 * Mock Google Calendar client for integration tests
 */
class MockCalendarClient implements ICalendarClient {
  async listEvents(
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
          {
            email: 'user2@example.com',
            responseStatus: 'tentative',
          },
        ],
      },
      {
        id: 'event2',
        summary: 'All Day Event',
        start: {
          date: '2024-01-16',
        },
        end: {
          date: '2024-01-17',
        },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event?eid=event2',
      },
    ];

    const filteredEvents = options?.q
      ? mockEvents.filter((e) => e.summary?.toLowerCase().includes(options.q!.toLowerCase()))
      : mockEvents;

    return {
      kind: 'calendar#events',
      etag: 'mock-etag',
      summary: calendarId === 'primary' ? 'Primary Calendar' : calendarId,
      updated: new Date().toISOString(),
      timeZone: 'America/New_York',
      accessRole: 'owner',
      items: filteredEvents.slice(0, options?.maxResults || 10),
    };
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    if (eventId === 'event1') {
      return {
        id: 'event1',
        summary: 'Team Standup',
        description: 'Daily team sync',
        location: 'Conference Room A',
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
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        creator: {
          email: 'creator@example.com',
          displayName: 'Event Creator',
        },
        organizer: {
          email: 'organizer@example.com',
          displayName: 'Event Organizer',
        },
        attendees: [
          {
            email: 'user1@example.com',
            displayName: 'User One',
            responseStatus: 'accepted',
          },
          {
            email: 'user2@example.com',
            displayName: 'User Two',
            responseStatus: 'tentative',
          },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 30,
            },
          ],
        },
      };
    }

    throw new Error(`Event not found: ${eventId}`);
  }

  async createEvent(calendarId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return {
      id: 'new-event-id',
      summary: event.summary || 'New Event',
      description: event.description,
      location: event.location,
      start: event.start || { dateTime: '2024-01-20T10:00:00-05:00' },
      end: event.end || { dateTime: '2024-01-20T11:00:00-05:00' },
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/event?eid=new-event-id',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      attendees: event.attendees,
    };
  }

  async listCalendars(_options?: {
    maxResults?: number;
    pageToken?: string;
  }): Promise<CalendarList> {
    return {
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
          selected: true,
          backgroundColor: '#9fc6e7',
          foregroundColor: '#000000',
        },
        {
          kind: 'calendar#calendarListEntry',
          etag: 'mock-etag-2',
          id: 'work@example.com',
          summary: 'Work Calendar',
          description: 'Work-related events',
          timeZone: 'America/New_York',
          accessRole: 'writer',
          selected: true,
          backgroundColor: '#f83a22',
          foregroundColor: '#000000',
        },
      ],
    };
  }

  async queryFreebusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    return {
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
            {
              start: '2024-01-15T14:00:00-05:00',
              end: '2024-01-15T15:00:00-05:00',
            },
          ],
        },
      },
    };
  }
}

async function main() {
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register handlers with mock client factory
  await registerHandlers(server, () => new MockCalendarClient());

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('google-calendar-workspace-mcp-server-integration-mock');
}

main();
