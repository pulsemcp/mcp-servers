import type {
  ITwistClient,
  Channel,
  Thread,
  ThreadWithMessages,
  Message,
} from '../../shared/src/server.js';
import { vi } from 'vitest';

/**
 * Creates a mock implementation of ITwistClient for functional tests.
 * This uses vitest's mocking capabilities for full control in unit tests.
 */
export function createFunctionalMockTwistClient(): ITwistClient {
  return {
    getChannels: vi.fn().mockResolvedValue([
      {
        id: 'ch_123',
        name: 'general',
        description: 'General discussion',
        workspace_id: '228287',
        archived: false,
        created_ts: 1234567890,
      },
    ] as Channel[]),

    getChannel: vi.fn().mockImplementation(
      async (channelId: string) =>
        ({
          id: channelId,
          name: 'test-channel',
          description: 'Test channel',
          workspace_id: '228287',
          archived: false,
          created_ts: 1234567890,
        }) as Channel
    ),

    getThreads: vi.fn().mockResolvedValue([
      {
        id: 'th_001',
        title: 'Test Thread',
        channel_id: 'ch_123',
        workspace_id: '228287',
        creator: 'user_123',
        posted_ts: 1234567890,
        last_updated_ts: 1234567890,
        archived: false,
      },
    ] as Thread[]),

    getThread: vi.fn().mockImplementation(
      async (threadId: string) =>
        ({
          id: threadId,
          title: 'Test Thread',
          channel_id: 'ch_123',
          workspace_id: '228287',
          creator: 'user_123',
          creator_name: 'Thread Creator',
          posted_ts: 1234567890,
          last_updated_ts: 1234567890,
          archived: false,
          content: 'This is the original thread content that starts the discussion',
          messages: [
            {
              id: 'msg_001',
              thread_id: threadId,
              content: 'Test message',
              creator: 'user_123',
              creator_name: 'Test User',
              posted_ts: 1234567890,
            },
          ],
        }) as ThreadWithMessages
    ),

    createThread: vi.fn().mockImplementation(
      async (channelId: string, title: string, _content: string) =>
        ({
          id: 'th_new',
          title,
          channel_id: channelId,
          workspace_id: '228287',
          creator: 'user_123',
          posted_ts: Date.now() / 1000,
          last_updated_ts: Date.now() / 1000,
          archived: false,
        }) as Thread
    ),

    addMessageToThread: vi.fn().mockImplementation(
      async (threadId: string, content: string) =>
        ({
          id: 'msg_new',
          thread_id: threadId,
          content,
          creator: 'user_123',
          creator_name: 'Test User',
          posted_ts: Date.now() / 1000,
        }) as Message
    ),

    closeThread: vi.fn().mockImplementation(
      async (threadId: string, message?: string) =>
        ({
          id: 'msg_close',
          thread_id: threadId,
          content: message || 'Thread closed',
          creator: 'user_123',
          creator_name: 'Test User',
          posted_ts: Date.now() / 1000,
        }) as Message
    ),

    getRobustThreads: vi.fn().mockImplementation(
      async (
        channelId: string,
        options?: {
          limit?: number;
          offset?: number;
          includeClosedThreads?: boolean;
          newerThanTs?: number;
        }
      ) => {
        // Mock multiple threads to support pagination tests from main
        const allThreads = [
          {
            id: 'th_001',
            title: 'Test Thread 1',
            channel_id: channelId,
            workspace_id: '228287',
            creator: 'user_123',
            posted_ts: 1234567890,
            last_updated_ts: 1234567895,
            archived: false,
            closed: false,
          },
          {
            id: 'th_002',
            title: 'Test Thread 2',
            channel_id: channelId,
            workspace_id: '228287',
            creator: 'user_123',
            posted_ts: 1234567890,
            last_updated_ts: 1234567894,
            archived: false,
            closed: true,
          },
          {
            id: 'th_003',
            title: 'Test Thread 3',
            channel_id: channelId,
            workspace_id: '228287',
            creator: 'user_123',
            posted_ts: 1234567890,
            last_updated_ts: 1234567893,
            archived: false,
            closed: false,
          },
          {
            id: 'th_004',
            title: 'Test Thread 4',
            channel_id: channelId,
            workspace_id: '228287',
            creator: 'user_123',
            posted_ts: 1234567890,
            last_updated_ts: 1234567892,
            archived: false,
            closed: true,
          },
        ] as Thread[];

        // Filter out archived threads
        let filteredThreads = allThreads.filter((thread) => !thread.archived);

        // Filter closed threads if requested
        if (!options?.includeClosedThreads) {
          filteredThreads = filteredThreads.filter((thread) => {
            const threadWithClosed = thread as Thread & { closed?: boolean };
            return !threadWithClosed.closed;
          });
        }

        const totalCount = filteredThreads.length;
        const offset = options?.offset || 0;
        const limit = options?.limit || totalCount;

        // Apply pagination
        const paginatedThreads = filteredThreads.slice(offset, offset + limit);
        const hasMore = offset + limit < totalCount;

        return {
          threads: paginatedThreads,
          totalCount,
          hasMore,
        };
      }
    ),
  };
}
