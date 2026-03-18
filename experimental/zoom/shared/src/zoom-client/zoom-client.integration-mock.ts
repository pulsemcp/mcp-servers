import type { IZoomClient } from '../server.js';
import type {
  ZoomMeeting,
  ListMeetingsResponse,
  ListRecordingsResponse,
  ZoomRecordingMeeting,
} from '../types.js';

interface MockData {
  meetings?: ZoomMeeting[];
  recordings?: ZoomRecordingMeeting[];
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of IZoomClient for integration tests.
 * This mocks the Zoom API client, NOT the MCP client.
 */
export function createIntegrationMockZoomClient(
  mockData: MockData = {}
): IZoomClient & { mockData: MockData } {
  const meetings = mockData.meetings || [
    {
      id: 123456789,
      uuid: 'mock-uuid-1',
      topic: 'Mock Weekly Standup',
      type: 2,
      start_time: '2025-01-15T10:00:00Z',
      duration: 30,
      timezone: 'America/New_York',
      join_url: 'https://zoom.us/j/123456789',
      status: 'waiting',
    },
  ];

  const recordings = mockData.recordings || [
    {
      uuid: 'mock-rec-uuid-1',
      id: 123456789,
      topic: 'Mock Recorded Meeting',
      start_time: '2025-01-14T14:00:00Z',
      duration: 45,
      total_size: 104857600,
      recording_count: 2,
      recording_files: [
        {
          id: 'rec-file-1',
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
          id: 'rec-file-2',
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
  ];

  return {
    mockData,

    async listMeetings(options) {
      const pageSize = options?.page_size || 30;
      return {
        page_size: pageSize,
        total_records: meetings.length,
        next_page_token: '',
        meetings: meetings.slice(0, pageSize),
      } as ListMeetingsResponse;
    },

    async getMeeting(meetingId: string) {
      const meeting = meetings.find((m) => String(m.id) === meetingId);
      if (!meeting) {
        throw new Error(`Meeting not found: ${meetingId}`);
      }
      return meeting;
    },

    async listRecordings(options) {
      const pageSize = options?.page_size || 30;
      return {
        from: options?.from || '2025-01-01',
        to: options?.to || '2025-01-31',
        page_size: pageSize,
        total_records: recordings.length,
        next_page_token: '',
        meetings: recordings.slice(0, pageSize),
      } as ListRecordingsResponse;
    },
  };
}
