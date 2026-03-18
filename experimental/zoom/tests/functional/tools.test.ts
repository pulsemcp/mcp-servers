import { describe, it, expect, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { listMeetingsTool } from '../../shared/src/tools/list-meetings.js';
import { getMeetingTool } from '../../shared/src/tools/get-meeting.js';
import { listRecordingsTool } from '../../shared/src/tools/list-recordings.js';
import { createMockZoomClient } from '../mocks/zoom-client.functional-mock.js';

describe('Zoom Tools', () => {
  const mockServer = new Server({ name: 'test', version: '1.0' }, { capabilities: { tools: {} } });

  describe('list_meetings', () => {
    it('should return formatted meeting list', async () => {
      const mockClient = createMockZoomClient();
      const tool = listMeetingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(mockClient.listMeetings).toHaveBeenCalled();
      expect(response.content[0].text).toContain('Found 2 meetings');
      expect(response.content[0].text).toContain('Weekly Standup');
      expect(response.content[0].text).toContain('Sprint Planning');
    });

    it('should pass type parameter to client', async () => {
      const mockClient = createMockZoomClient();
      const tool = listMeetingsTool(mockServer, () => mockClient);

      await tool.handler({ type: 'live' });

      expect(mockClient.listMeetings).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'live' })
      );
    });

    it('should handle empty meeting list', async () => {
      const mockClient = createMockZoomClient();
      mockClient.listMeetings = vi.fn().mockResolvedValue({
        page_size: 30,
        total_records: 0,
        next_page_token: '',
        meetings: [],
      });
      const tool = listMeetingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.content[0].text).toContain('No meetings found');
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockZoomClient();
      mockClient.listMeetings = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));
      const tool = listMeetingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('API rate limit exceeded');
    });
  });

  describe('get_meeting', () => {
    it('should return meeting details', async () => {
      const mockClient = createMockZoomClient();
      const tool = getMeetingTool(mockServer, () => mockClient);

      const response = await tool.handler({ meeting_id: '123456789' });

      expect(mockClient.getMeeting).toHaveBeenCalledWith('123456789');
      expect(response.content[0].text).toContain('Test Meeting');
      expect(response.content[0].text).toContain('123456789');
    });

    it('should require meeting_id parameter', async () => {
      const mockClient = createMockZoomClient();
      const tool = getMeetingTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.isError).toBe(true);
    });

    it('should handle meeting not found', async () => {
      const mockClient = createMockZoomClient();
      mockClient.getMeeting = vi.fn().mockRejectedValue(new Error('Meeting not found: 999'));
      const tool = getMeetingTool(mockServer, () => mockClient);

      const response = await tool.handler({ meeting_id: '999' });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Meeting not found');
    });
  });

  describe('list_recordings', () => {
    it('should return formatted recordings list', async () => {
      const mockClient = createMockZoomClient();
      const tool = listRecordingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(mockClient.listRecordings).toHaveBeenCalled();
      expect(response.content[0].text).toContain('Found 1 recorded meetings');
      expect(response.content[0].text).toContain('Recorded Team Sync');
      expect(response.content[0].text).toContain('MP4');
      expect(response.content[0].text).toContain('TRANSCRIPT');
    });

    it('should pass date range to client', async () => {
      const mockClient = createMockZoomClient();
      const tool = listRecordingsTool(mockServer, () => mockClient);

      await tool.handler({ from: '2025-01-01', to: '2025-01-31' });

      expect(mockClient.listRecordings).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2025-01-01', to: '2025-01-31' })
      );
    });

    it('should handle empty recordings', async () => {
      const mockClient = createMockZoomClient();
      mockClient.listRecordings = vi.fn().mockResolvedValue({
        from: '2025-01-01',
        to: '2025-01-31',
        page_size: 30,
        total_records: 0,
        next_page_token: '',
        meetings: [],
      });
      const tool = listRecordingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.content[0].text).toContain('No recordings found');
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockZoomClient();
      mockClient.listRecordings = vi.fn().mockRejectedValue(new Error('Unauthorized'));
      const tool = listRecordingsTool(mockServer, () => mockClient);

      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Unauthorized');
    });
  });
});
