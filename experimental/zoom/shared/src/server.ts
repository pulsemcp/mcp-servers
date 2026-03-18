import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type { ZoomMeeting, ListMeetingsResponse, ListRecordingsResponse } from './types.js';

export interface IZoomClient {
  listMeetings(options?: {
    type?: string;
    page_size?: number;
    next_page_token?: string;
  }): Promise<ListMeetingsResponse>;

  getMeeting(meetingId: string): Promise<ZoomMeeting>;

  listRecordings(options?: {
    from?: string;
    to?: string;
    page_size?: number;
    next_page_token?: string;
  }): Promise<ListRecordingsResponse>;
}

export class ZoomClient implements IZoomClient {
  constructor(private accessToken: string) {}

  async listMeetings(options?: {
    type?: string;
    page_size?: number;
    next_page_token?: string;
  }): Promise<ListMeetingsResponse> {
    const { listMeetings } = await import('./zoom-client/lib/list-meetings.js');
    return listMeetings(this.accessToken, options);
  }

  async getMeeting(meetingId: string): Promise<ZoomMeeting> {
    const { getMeeting } = await import('./zoom-client/lib/get-meeting.js');
    return getMeeting(this.accessToken, meetingId);
  }

  async listRecordings(options?: {
    from?: string;
    to?: string;
    page_size?: number;
    next_page_token?: string;
  }): Promise<ListRecordingsResponse> {
    const { listRecordings } = await import('./zoom-client/lib/list-recordings.js');
    return listRecordings(this.accessToken, options);
  }
}

export type ClientFactory = () => IZoomClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'zoom-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    const factory =
      clientFactory ||
      (() => {
        const accessToken = process.env.ZOOM_ACCESS_TOKEN;

        if (!accessToken) {
          throw new Error('ZOOM_ACCESS_TOKEN environment variable must be configured');
        }

        return new ZoomClient(accessToken);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
