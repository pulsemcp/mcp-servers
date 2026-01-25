import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listEventsTool } from '../../shared/src/tools/list-events.js';
import { getEventTool } from '../../shared/src/tools/get-event.js';
import { createEventTool } from '../../shared/src/tools/create-event.js';
import { updateEventTool } from '../../shared/src/tools/update-event.js';
import { deleteEventTool } from '../../shared/src/tools/delete-event.js';
import { listCalendarsTool } from '../../shared/src/tools/list-calendars.js';
import { queryFreebusyTool } from '../../shared/src/tools/query-freebusy.js';
import { createMockCalendarClient } from '../mocks/calendar-client.functional-mock.js';
import type { ICalendarClient } from '../../shared/src/server.js';

describe('Google Calendar MCP Server Tools', () => {
  let mockClient: ICalendarClient;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createMockCalendarClient();
    mockServer = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
  });

  describe('list_calendar_events', () => {
    it('should list events with default parameters', async () => {
      const tool = listEventsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Calendar Events');
      expect(result.content[0].text).toContain('Team Standup');
      expect(result.content[0].text).toContain('Project Meeting');
      expect(mockClient.listEvents).toHaveBeenCalledWith('primary', expect.any(Object));
    });

    it('should filter events by query', async () => {
      const tool = listEventsTool(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'Team' });

      expect(result.content[0].text).toContain('Team Standup');
      expect(result.content[0].text).not.toContain('Project Meeting');
    });

    it('should include timezone in event times', async () => {
      const tool = listEventsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('(America/New_York)');
    });

    it('should handle events without timezone gracefully', async () => {
      const clientWithoutTz = createMockCalendarClient();
      vi.mocked(clientWithoutTz.listEvents).mockResolvedValue({
        kind: 'calendar#events',
        etag: 'mock-etag',
        summary: 'Primary Calendar',
        updated: new Date().toISOString(),
        timeZone: 'America/New_York',
        accessRole: 'owner',
        items: [
          {
            id: 'event-no-tz',
            summary: 'Event Without Timezone',
            start: {
              dateTime: '2024-01-15T10:00:00-05:00',
              // No timeZone property
            },
            end: {
              dateTime: '2024-01-15T10:30:00-05:00',
              // No timeZone property
            },
          },
        ],
      });

      const tool = listEventsTool(mockServer, () => clientWithoutTz);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Event Without Timezone');
      expect(result.content[0].text).not.toContain('undefined');
      expect(result.content[0].text).not.toContain('null');
    });

    it('should return message when no events found', async () => {
      const emptyClient = createMockCalendarClient();
      vi.mocked(emptyClient.listEvents).mockResolvedValue({
        kind: 'calendar#events',
        etag: 'mock-etag',
        summary: 'Primary Calendar',
        updated: new Date().toISOString(),
        timeZone: 'America/New_York',
        accessRole: 'owner',
        items: [],
      });

      const tool = listEventsTool(mockServer, () => emptyClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No events found');
    });

    it('should handle errors gracefully', async () => {
      const errorClient = createMockCalendarClient();
      vi.mocked(errorClient.listEvents).mockRejectedValue(new Error('API Error'));

      const tool = listEventsTool(mockServer, () => errorClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing events');
    });
  });

  describe('get_calendar_event', () => {
    it('should retrieve a specific event', async () => {
      const tool = getEventTool(mockServer, () => mockClient);
      const result = await tool.handler({ event_id: 'event1' });

      expect(result.content[0].text).toContain('Event Details');
      expect(result.content[0].text).toContain('Team Standup');
      expect(mockClient.getEvent).toHaveBeenCalledWith('primary', 'event1');
    });

    it('should handle non-existent events', async () => {
      const tool = getEventTool(mockServer, () => mockClient);
      const result = await tool.handler({ event_id: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting event');
    });

    it('should include timezone in event times', async () => {
      const tool = getEventTool(mockServer, () => mockClient);
      const result = await tool.handler({ event_id: 'event1' });

      expect(result.content[0].text).toContain('(America/New_York)');
    });
  });

  describe('create_calendar_event', () => {
    it('should create a new event', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'New Meeting',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
      });

      expect(result.content[0].text).toContain('Event Created Successfully');
      expect(result.content[0].text).toContain('New Meeting');
      expect(mockClient.createEvent).toHaveBeenCalled();
    });

    it('should create a new event with attachments', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'Meeting with Attachment',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
        attachments: [
          {
            file_url: 'https://example.com/document.pdf',
            title: 'Meeting Notes',
          },
        ],
      });

      expect(result.content[0].text).toContain('Event Created Successfully');
      expect(result.content[0].text).toContain('Meeting with Attachment');
      expect(result.content[0].text).toContain('Attachments');
      expect(result.content[0].text).toContain('Meeting Notes');
      expect(mockClient.createEvent).toHaveBeenCalledWith(
        'primary',
        expect.objectContaining({
          attachments: [{ fileUrl: 'https://example.com/document.pdf', title: 'Meeting Notes' }],
        }),
        { supportsAttachments: true }
      );
    });

    it('should not pass supportsAttachments when no attachments provided', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      await tool.handler({
        summary: 'Simple Meeting',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
      });

      expect(mockClient.createEvent).toHaveBeenCalledWith('primary', expect.any(Object), undefined);
    });

    it('should reject invalid attachment URLs', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'Meeting with Bad URL',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
        attachments: [
          {
            file_url: 'not-a-valid-url',
            title: 'Bad Attachment',
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating event');
    });

    it('should require start and end times', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'New Meeting',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating event');
    });

    it('should include timezone in response when provided', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'New Meeting',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
        start_timezone: 'America/New_York',
        end_timezone: 'America/New_York',
      });

      expect(result.content[0].text).toContain('Event Created Successfully');
      expect(result.content[0].text).toContain('(America/New_York)');
    });
  });

  describe('update_calendar_event', () => {
    it('should update an existing event', async () => {
      const tool = updateEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'event1',
        summary: 'Updated Meeting',
      });

      expect(result.content[0].text).toContain('Event Updated Successfully');
      expect(result.content[0].text).toContain('Updated Meeting');
      expect(mockClient.updateEvent).toHaveBeenCalled();
    });

    it('should update an event with attachments', async () => {
      const tool = updateEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'event1',
        attachments: [
          {
            file_url: 'https://example.com/updated-doc.pdf',
            title: 'Updated Document',
          },
        ],
      });

      expect(result.content[0].text).toContain('Event Updated Successfully');
      expect(result.content[0].text).toContain('Attachments');
      expect(result.content[0].text).toContain('Updated Document');
      expect(mockClient.updateEvent).toHaveBeenCalledWith(
        'primary',
        'event1',
        expect.objectContaining({
          attachments: [
            { fileUrl: 'https://example.com/updated-doc.pdf', title: 'Updated Document' },
          ],
        }),
        { supportsAttachments: true }
      );
    });

    it('should handle non-existent events', async () => {
      const tool = updateEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'nonexistent',
        summary: 'Update Attempt',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating event');
    });

    it('should include timezone in response', async () => {
      const tool = updateEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'event1',
        summary: 'Updated Meeting',
      });

      expect(result.content[0].text).toContain('Event Updated Successfully');
      expect(result.content[0].text).toContain('(America/New_York)');
    });
  });

  describe('delete_calendar_event', () => {
    it('should delete an existing event', async () => {
      const tool = deleteEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'event1',
      });

      expect(result.content[0].text).toContain('Event Deleted Successfully');
      expect(mockClient.deleteEvent).toHaveBeenCalled();
    });

    it('should handle non-existent events', async () => {
      const tool = deleteEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        event_id: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error deleting event');
    });
  });

  describe('list_calendars', () => {
    it('should list available calendars', async () => {
      const tool = listCalendarsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Available Calendars');
      expect(result.content[0].text).toContain('Primary Calendar');
      expect(result.content[0].text).toContain('Work Calendar');
      expect(mockClient.listCalendars).toHaveBeenCalled();
    });
  });

  describe('query_calendar_freebusy', () => {
    it('should query freebusy information', async () => {
      const tool = queryFreebusyTool(mockServer, () => mockClient);
      const result = await tool.handler({
        time_min: '2024-01-15T00:00:00Z',
        time_max: '2024-01-15T23:59:59Z',
        calendar_ids: ['primary'],
      });

      expect(result.content[0].text).toContain('Free/Busy Information');
      expect(result.content[0].text).toContain('Busy Periods');
      expect(mockClient.queryFreebusy).toHaveBeenCalled();
    });

    it('should include timezone in response when provided', async () => {
      const tool = queryFreebusyTool(mockServer, () => mockClient);
      const result = await tool.handler({
        time_min: '2024-01-15T00:00:00Z',
        time_max: '2024-01-15T23:59:59Z',
        calendar_ids: ['primary'],
        timezone: 'America/Los_Angeles',
      });

      expect(result.content[0].text).toContain('Free/Busy Information');
      expect(result.content[0].text).toContain('**Times shown in:** America/Los_Angeles');
    });
  });
});
