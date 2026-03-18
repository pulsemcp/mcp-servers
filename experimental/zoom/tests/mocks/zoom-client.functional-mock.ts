import { vi } from 'vitest';
import type { IZoomClient } from '../../shared/src/server.js';

export function createMockZoomClient(): IZoomClient {
  return {
    listMeetings: vi.fn().mockResolvedValue({
      page_size: 30,
      total_records: 2,
      next_page_token: '',
      meetings: [
        {
          id: 123456789,
          uuid: 'uuid-1',
          topic: 'Weekly Standup',
          type: 2,
          start_time: '2025-01-15T10:00:00Z',
          duration: 30,
          timezone: 'America/New_York',
          join_url: 'https://zoom.us/j/123456789',
          status: 'waiting',
        },
        {
          id: 987654321,
          uuid: 'uuid-2',
          topic: 'Sprint Planning',
          type: 2,
          start_time: '2025-01-16T14:00:00Z',
          duration: 60,
          timezone: 'America/New_York',
          join_url: 'https://zoom.us/j/987654321',
          status: 'waiting',
        },
      ],
    }),

    getMeeting: vi.fn().mockImplementation(async (meetingId: string) => ({
      id: Number(meetingId),
      uuid: `uuid-${meetingId}`,
      topic: 'Test Meeting',
      type: 2,
      start_time: '2025-01-15T10:00:00Z',
      duration: 30,
      timezone: 'America/New_York',
      join_url: `https://zoom.us/j/${meetingId}`,
      status: 'waiting',
    })),

    listRecordings: vi.fn().mockResolvedValue({
      from: '2025-01-01',
      to: '2025-01-31',
      page_size: 30,
      total_records: 1,
      next_page_token: '',
      meetings: [
        {
          uuid: 'rec-uuid-1',
          id: 123456789,
          topic: 'Recorded Team Sync',
          start_time: '2025-01-14T14:00:00Z',
          duration: 45,
          total_size: 104857600,
          recording_count: 2,
          recording_files: [
            {
              id: 'file-1',
              meeting_id: '123456789',
              recording_start: '2025-01-14T14:00:00Z',
              recording_end: '2025-01-14T14:45:00Z',
              file_type: 'MP4',
              file_size: 52428800,
              download_url: 'https://zoom.us/rec/download/mock-1',
              status: 'completed',
              recording_type: 'shared_screen_with_speaker_view',
            },
            {
              id: 'file-2',
              meeting_id: '123456789',
              recording_start: '2025-01-14T14:00:00Z',
              recording_end: '2025-01-14T14:45:00Z',
              file_type: 'TRANSCRIPT',
              file_size: 1024,
              download_url: 'https://zoom.us/rec/download/mock-2',
              status: 'completed',
              recording_type: 'audio_transcript',
            },
          ],
        },
      ],
    }),
  };
}
