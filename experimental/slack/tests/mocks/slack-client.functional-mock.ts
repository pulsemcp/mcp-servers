import { vi } from 'vitest';
import type { ISlackClient } from '../../shared/src/server.js';

export function createMockSlackClient(): ISlackClient {
  return {
    getChannels: vi.fn().mockResolvedValue([
      {
        id: 'C123456789',
        name: 'general',
        is_channel: true,
        is_group: false,
        is_im: false,
        is_mpim: false,
        is_private: false,
        is_archived: false,
        is_general: true,
        is_member: true,
        num_members: 10,
        created: 1234567890,
      },
      {
        id: 'C987654321',
        name: 'random',
        is_channel: true,
        is_group: false,
        is_im: false,
        is_mpim: false,
        is_private: false,
        is_archived: false,
        is_general: false,
        is_member: true,
        num_members: 5,
        created: 1234567891,
      },
    ]),

    getChannel: vi.fn().mockResolvedValue({
      id: 'C123456789',
      name: 'general',
      is_channel: true,
      is_group: false,
      is_im: false,
      is_mpim: false,
      is_private: false,
      is_archived: false,
      is_general: true,
      is_member: true,
      num_members: 10,
      created: 1234567890,
      topic: { value: 'General discussion', creator: 'U123', last_set: 1234567890 },
      purpose: { value: 'A place for general chat', creator: 'U123', last_set: 1234567890 },
    }),

    getMessages: vi.fn().mockResolvedValue({
      messages: [
        {
          type: 'message',
          user: 'U123456789',
          text: 'Hello world',
          ts: '1234567890.123456',
        },
        {
          type: 'message',
          user: 'U987654321',
          text: 'Hi there!',
          ts: '1234567890.123457',
          reactions: [{ name: 'wave', count: 1, users: ['U123456789'] }],
        },
        {
          type: 'message',
          user: 'U123456789',
          text: 'Check out this link',
          ts: '1234567890.123458',
          attachments: [
            {
              title: 'Example Article',
              title_link: 'https://example.com/article',
              text: 'An interesting article about testing',
              service_name: 'Example',
              from_url: 'https://example.com/article',
              image_url: 'https://example.com/preview.png',
            },
          ],
        },
        {
          type: 'message',
          user: 'U987654321',
          text: 'Here is the screenshot',
          ts: '1234567890.123459',
          files: [
            {
              id: 'F123456789',
              name: 'screenshot.png',
              mimetype: 'image/png',
              size: 204800,
              permalink: 'https://slack.com/files/screenshot.png',
            },
          ],
        },
      ],
      hasMore: false,
    }),

    getThread: vi.fn().mockResolvedValue({
      messages: [
        {
          type: 'message',
          user: 'U123456789',
          text: 'Parent message',
          ts: '1234567890.123456',
          thread_ts: '1234567890.123456',
          reply_count: 2,
          attachments: [
            {
              title: 'GitHub PR',
              title_link: 'https://github.com/org/repo/pull/1',
              text: 'Fix: resolve attachment rendering',
              service_name: 'GitHub',
              from_url: 'https://github.com/org/repo/pull/1',
              thumb_url: 'https://github.com/thumb.png',
            },
          ],
        },
        {
          type: 'message',
          user: 'U987654321',
          text: 'First reply',
          ts: '1234567890.123457',
          thread_ts: '1234567890.123456',
        },
        {
          type: 'message',
          user: 'U123456789',
          text: 'Second reply',
          ts: '1234567890.123458',
          thread_ts: '1234567890.123456',
          files: [
            {
              id: 'F987654321',
              name: 'report.pdf',
              mimetype: 'application/pdf',
              size: 1048576,
              permalink: 'https://slack.com/files/report.pdf',
            },
          ],
        },
      ],
      hasMore: false,
    }),

    postMessage: vi.fn().mockResolvedValue({
      type: 'message',
      text: 'Posted message',
      ts: '1234567890.999999',
    }),

    updateMessage: vi.fn().mockResolvedValue({
      type: 'message',
      text: 'Updated message',
      ts: '1234567890.123456',
      edited: {
        user: 'U123456789',
        ts: '1234567891.000000',
      },
    }),

    addReaction: vi.fn().mockResolvedValue(undefined),

    getFileInfo: vi.fn().mockResolvedValue({
      id: 'F123456789',
      name: 'screenshot.png',
      title: 'screenshot',
      mimetype: 'image/png',
      size: 204800,
      url_private: 'https://files.slack.com/files-pri/T123/screenshot.png',
      url_private_download: 'https://files.slack.com/files-pri/T123/download/screenshot.png',
      permalink: 'https://slack.com/files/screenshot.png',
    }),

    downloadFile: vi.fn().mockResolvedValue(Buffer.from('fake-file-content')),

    uploadSnippet: vi.fn().mockResolvedValue({
      id: 'F111222333',
      name: 'snippet.txt',
      title: 'Test Snippet',
      mimetype: 'text/plain',
      size: 1024,
      permalink: 'https://slack.com/files/snippet.txt',
    }),
  };
}
