import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listEventsTool } from '../../shared/src/tools/list-events.js';
import { getEventTool } from '../../shared/src/tools/get-event.js';
import { createEventTool } from '../../shared/src/tools/create-event.js';
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

  describe('gcal_list_events', () => {
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

  describe('gcal_get_event', () => {
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
  });

  describe('gcal_create_event', () => {
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

    it('should require start and end times', async () => {
      const tool = createEventTool(mockServer, () => mockClient);
      const result = await tool.handler({
        summary: 'New Meeting',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error creating event');
    });
  });

  describe('gcal_list_calendars', () => {
    it('should list available calendars', async () => {
      const tool = listCalendarsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Available Calendars');
      expect(result.content[0].text).toContain('Primary Calendar');
      expect(result.content[0].text).toContain('Work Calendar');
      expect(mockClient.listCalendars).toHaveBeenCalled();
    });
  });

  describe('gcal_query_freebusy', () => {
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
  });
});
