export interface ZoomMeeting {
  id: number;
  uuid: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  status: string;
}

export interface ZoomRecording {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomRecordingMeeting {
  uuid: string;
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecording[];
}

export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  status: string;
}

export interface ListMeetingsResponse {
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: ZoomMeeting[];
}

export interface ListRecordingsResponse {
  from: string;
  to: string;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: ZoomRecordingMeeting[];
}
