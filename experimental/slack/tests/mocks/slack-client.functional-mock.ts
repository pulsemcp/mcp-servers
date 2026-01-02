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
  };
}
